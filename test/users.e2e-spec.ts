import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import request from 'supertest';
import { useContainer, ValidationError } from 'class-validator';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { AppModule } from '../src/app.module';
import { User } from '../src/modules/users/schemas/user.schema';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let accessToken: string;

  const testUser = {
    usr_username: 'users_e2e',
    usr_email: 'users_e2e@test.com',
    usr_password: 'Password123',
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useValue({ sendMail: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('/api');
    app.useGlobalPipes(
      new ValidationPipe({
        exceptionFactory: (validationErrors: ValidationError[] = []) => {
          return new BadRequestException(
            validationErrors.map((error) => ({
              field: error.property,
              error: Object.values(error.constraints)[0],
            })),
          );
        },
        stopAtFirstError: true,
      }),
    );
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    await app.init();

    userModel = moduleRef.get(getModelToken(User.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });

    await request(app.getHttpServer()).post('/api/signup').send(testUser);

    const loginResponse = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('GET /api/profile', () => {
    it('should return the authenticated user payload', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(testUser.usr_email);
      expect(response.body.username).toBe(testUser.usr_username);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/profile').expect(401);
    });

    it('should return 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return the list of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401);
    });
  });

  describe('PATCH /api/update-profile', () => {
    it('should update the user profile and return updated fields', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/update-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('usr_username', 'users_e2e_updated')
        .field('usr_firstname', 'John')
        .field('usr_lastname', 'Doe')
        .expect(200);

      expect(response.body.usr_username).toBe('users_e2e_updated');
      expect(response.body.usr_firstname).toBe('John');
      expect(response.body.usr_lastname).toBe('Doe');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch('/api/update-profile')
        .field('usr_username', 'someone')
        .expect(401);
    });

    it('should return 422 when an invalid file type is uploaded', async () => {
      await request(app.getHttpServer())
        .patch('/api/update-profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('usr_username', 'users_e2e_updated')
        .attach('file', Buffer.from('fake content'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(422);
    });
  });

  describe('PATCH /api/change-password', () => {
    const newPassword = 'NewPassword456';

    it('should change the password successfully', async () => {
      await request(app.getHttpServer())
        .patch('/api/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(200);
    });

    it('the new password should allow login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: newPassword })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch('/api/change-password')
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(401);
    });
  });

  describe('GET /api/check-username/:usr_username', () => {
    it('should return true when username exists', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/check-username/users_e2e_updated')
        .expect(200);

      expect(response.text).toBe('true');
    });

    it('should return false when username does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/check-username/nonexistentuser')
        .expect(200);

      expect(response.text).toBe('false');
    });
  });

  describe('GET /api/check-email/:usr_email', () => {
    it('should return true when email exists', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/check-email/${testUser.usr_email}`)
        .expect(200);

      expect(response.text).toBe('true');
    });

    it('should return false when email does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/check-email/nobody@test.com')
        .expect(200);

      expect(response.text).toBe('false');
    });
  });
});

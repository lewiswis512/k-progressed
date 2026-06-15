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
import { UserReset } from '../src/modules/users/schemas/user-reset.schema';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let userModel: Model<User>;
  let userResetModel: Model<UserReset>;

  const testUser = {
    usr_username: 'testuser_e2e',
    usr_email: 'testuser_e2e@test.com',
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
    userResetModel = moduleRef.get(getModelToken(UserReset.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await userResetModel.deleteMany({ usr_rest_email: testUser.usr_email });
  });

  afterAll(async () => {
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await userResetModel.deleteMany({ usr_rest_email: testUser.usr_email });
    await app.close();
  });

  describe('POST /api/signup', () => {
    it('should register a new user and return it without a password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/signup')
        .send(testUser)
        .expect(201);

      expect(response.body.usr_email).toBe(testUser.usr_email);
      expect(response.body.usr_username).toBe(testUser.usr_username);
      expect(response.body.usr_password).toBeNull();
    });

    it('should return 400 when the email is already taken', async () => {
      await request(app.getHttpServer())
        .post('/api/signup')
        .send(testUser)
        .expect(400);
    });

    it('should return 400 when the password is shorter than 8 characters', async () => {
      await request(app.getHttpServer())
        .post('/api/signup')
        .send({ ...testUser, usr_email: 'other@test.com', usr_password: 'short' })
        .expect(400);
    });

    it('should return 400 when email is missing', async () => {
      const { usr_email, ...body } = testUser;

      await request(app.getHttpServer())
        .post('/api/signup')
        .send(body)
        .expect(400);
    });
  });

  describe('POST /api/login', () => {
    it('should return an access token with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should return 401 with a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: 'WrongPass123' })
        .expect(401);
    });

    it('should return 404 when the user does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: 'nobody@test.com', usr_password: 'Password123' })
        .expect(404);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_password: 'Password123' })
        .expect(400);
    });
  });

  describe('POST /api/reset-password', () => {
    it('should send a reset email and return a token record', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reset-password')
        .send({ email: testUser.usr_email })
        .expect(201);

      expect(response.body.usr_rest_email).toBe(testUser.usr_email);
      expect(response.body).toHaveProperty('usr_rest_token');
    });

    it('should return 404 when email does not exist', async () => {
      await request(app.getHttpServer())
        .post('/api/reset-password')
        .send({ email: 'nobody@test.com' })
        .expect(404);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/reset-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/forgot-password/:token', () => {
    const newPassword = 'NewPassword456';
    let resetToken: string;

    beforeAll(async () => {
      const record = await userResetModel.findOne({
        usr_rest_email: testUser.usr_email,
      });
      resetToken = record?.usr_rest_token;
    });

    it('should change the password with a valid token', async () => {
      await request(app.getHttpServer())
        .post(`/api/forgot-password/${resetToken}`)
        .send({
          email: testUser.usr_email,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);
    });

    it('the new password should allow login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: newPassword })
        .expect(201);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should return 404 with an invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/forgot-password/invalidtoken')
        .send({
          email: testUser.usr_email,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(404);
    });

    it('should return 410 with an expired token', async () => {
      await userResetModel.create({
        _id: new (require('mongoose').Types.ObjectId)(),
        usr_rest_email: testUser.usr_email,
        usr_rest_token: 'expiredtoken',
        usr_rest_expired_at: new Date(Date.now() - 2 * 60 * 1000),
      });

      await request(app.getHttpServer())
        .post('/api/forgot-password/expiredtoken')
        .send({
          email: testUser.usr_email,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(410);
    });
  });
});

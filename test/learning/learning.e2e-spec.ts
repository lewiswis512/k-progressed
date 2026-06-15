import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../../src/modules/users/schemas/user.schema';
import { createApp } from './setup';

describe('Learning (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let accessToken: string;

  const testUser = {
    usr_username: 'learning_e2e',
    usr_email: 'learning_e2e@test.com',
    usr_password: 'Password123',
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await request(app.getHttpServer()).post('/api/signup').send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('list purchased courses', () => {
    it('should return the list of purchased courses for the authenticated user', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/learning')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/learning').expect(401);
    });
  });
});

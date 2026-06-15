import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../src/modules/users/schemas/user.schema';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import { createApp } from './setup';

describe('Teachers (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let teacherModel: Model<Teacher>;
  let accessToken: string;
  let teacherId: string;
  let userId: string;

  const testUser = {
    usr_username: 'teachers_e2e',
    usr_email: 'teachers_e2e@test.com',
    usr_password: 'Password123',
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    teacherModel = moduleRef.get(getModelToken(Teacher.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });
    const signupRes = await request(app.getHttpServer()).post('/api/signup').send(testUser);
    userId = signupRes.body._id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (teacherId) await teacherModel.findByIdAndDelete(teacherId);
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('add a teacher profile', () => {
    it('should create a teacher profile', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/teachers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tchr_biography: 'A passionate e2e test teacher with years of experience.',
          tchr_title: 'E2E Trainer',
          user_id: userId,
        })
        .expect(201);

      teacherId = res.body._id;
      expect(res.body.tchr_title).toBe('E2E Trainer');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/teachers')
        .send({ tchr_biography: 'Bio', tchr_title: 'Title', user_id: userId })
        .expect(401);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/teachers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ tchr_title: 'Title Only' })
        .expect(400);
    });
  });

  describe('list teachers', () => {
    it('should return the list of teachers', async () => {
      const res = await request(app.getHttpServer()).get('/api/teachers').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('get a teacher by id', () => {
    it('should return the teacher', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/teachers/${teacherId}`)
        .expect(200);

      expect(res.body._id).toBe(teacherId);
      expect(res.body.tchr_title).toBe('E2E Trainer');
    });

    it('should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/teachers/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('update a teacher', () => {
    it('should update the teacher profile', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          tchr_biography: 'Updated biography for the e2e teacher.',
          tchr_title: 'Senior E2E Trainer',
        })
        .expect(200);

      expect(res.body.tchr_title).toBe('Senior E2E Trainer');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/teachers/${teacherId}`)
        .send({ tchr_title: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('delete a teacher', () => {
    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/teachers/${teacherId}`)
        .expect(401);
    });

    it('should delete the teacher profile', async () => {
      await request(app.getHttpServer())
        .delete(`/api/teachers/${teacherId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      teacherId = null;
    });
  });
});

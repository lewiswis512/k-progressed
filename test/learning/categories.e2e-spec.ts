import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../src/modules/users/schemas/user.schema';
import { Category } from '../../src/modules/learning/schemas/category.schema';
import { createApp } from './setup';

describe('Categories (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let categoryModel: Model<Category>;
  let accessToken: string;
  let categoryId: string;

  const testUser = {
    usr_username: 'categories_e2e',
    usr_email: 'categories_e2e@test.com',
    usr_password: 'Password123',
  };

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await request(app.getHttpServer()).post('/api/signup').send(testUser);

    const loginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (categoryId) await categoryModel.findByIdAndDelete(categoryId);
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('add a category', () => {
    it('should create a category', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ctgr_name: 'E2E Category' })
        .expect(201);

      categoryId = res.body._id;
      expect(res.body.ctgr_name).toBe('E2E Category');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/categories')
        .send({ ctgr_name: 'Unauthorized' })
        .expect(401);
    });

    it('should return 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('list categories', () => {
    it('should return the list of categories', async () => {
      const res = await request(app.getHttpServer()).get('/api/categories').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('get a category by id', () => {
    it('should return the category', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/categories/${categoryId}`)
        .expect(200);

      expect(res.body._id).toBe(categoryId);
      expect(res.body.ctgr_name).toBe('E2E Category');
    });

    it('should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/categories/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('update a category', () => {
    it('should update the category name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ctgr_name: 'E2E Category Updated' })
        .expect(200);

      expect(res.body.ctgr_name).toBe('E2E Category Updated');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/categories/${categoryId}`)
        .send({ ctgr_name: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('delete a category', () => {
    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/categories/${categoryId}`)
        .expect(401);
    });

    it('should delete the category', async () => {
      await request(app.getHttpServer())
        .delete(`/api/categories/${categoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      categoryId = null;
    });
  });
});

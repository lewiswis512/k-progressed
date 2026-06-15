jest.mock('cloudinary', () => {
  const { PassThrough } = require('stream');
  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: jest.fn((options, callback) => {
          const stream = new PassThrough();
          stream.on('finish', () => {
            callback(null, {
              secure_url: 'https://res.cloudinary.com/test/image/upload/test.jpg',
              public_id: 'test/test',
            });
          });
          return stream;
        }),
        destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
        upload: jest.fn().mockResolvedValue({
          secure_url: 'https://res.cloudinary.com/test/image/upload/screenshot.jpg',
          public_id: 'test/screenshot',
        }),
      },
    },
  };
});

import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../src/modules/users/schemas/user.schema';
import { Category } from '../../src/modules/learning/schemas/category.schema';
import { Course } from '../../src/modules/learning/schemas/course.schema';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import { createApp } from './setup';

describe('Courses (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let categoryModel: Model<Category>;
  let courseModel: Model<Course>;
  let teacherModel: Model<Teacher>;
  let accessToken: string;
  let categoryId: string;
  let teacherId: string;
  let courseId: string;
  let userId: string;

  const testUser = {
    usr_username: 'courses_e2e',
    usr_email: 'courses_e2e@test.com',
    usr_password: 'Password123',
  };

  const fakeImage = Buffer.from('fake-image-content');

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));
    courseModel = moduleRef.get(getModelToken(Course.name));
    teacherModel = moduleRef.get(getModelToken(Teacher.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });
    const signupRes = await request(app.getHttpServer()).post('/api/signup').send(testUser);
    userId = signupRes.body._id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });
    accessToken = loginRes.body.accessToken;

    const catRes = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ctgr_name: 'Courses E2E Category' });
    categoryId = catRes.body._id;

    const tchrRes = await request(app.getHttpServer())
      .post('/api/teachers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tchr_biography: 'E2E teacher bio', tchr_title: 'Courses E2E Teacher', user_id: userId });
    teacherId = tchrRes.body._id;
  });

  afterAll(async () => {
    if (courseId) await courseModel.findByIdAndDelete(courseId);
    if (teacherId) await teacherModel.findByIdAndDelete(teacherId);
    if (categoryId) await categoryModel.findByIdAndDelete(categoryId);
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('add a course', () => {
    it('should create a course with a cover image', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('crs_title', 'E2E Course')
        .field('crs_description', 'End-to-end test course description')
        .field('crs_price', '29.99')
        .field('crs_isPaid', 'true')
        .field('level_id', '1')
        .field('category_id', categoryId)
        .field('teacher_id', teacherId)
        .attach('file', fakeImage, { filename: 'course.jpg', contentType: 'image/jpeg' })
        .expect(201);

      courseId = res.body._id;
      expect(res.body.crs_title).toBe('E2E Course');
      expect(res.body.crs_photo).toBe('https://res.cloudinary.com/test/image/upload/test.jpg');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/courses')
        .field('crs_title', 'Unauthorized')
        .expect(401);
    });

    it('should return 422 when the cover image is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/courses')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('crs_title', 'No File Course')
        .field('crs_description', 'Description')
        .field('crs_price', '10')
        .field('level_id', '1')
        .field('category_id', categoryId)
        .expect(422);
    });
  });

  describe('list courses', () => {
    it('should return a paginated list of courses', async () => {
      const res = await request(app.getHttpServer()).get('/api/courses').expect(200);

      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter courses by keyword', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/courses?q=E2E Course')
        .expect(200);

      expect(res.body).toHaveProperty('data');
    });
  });

  describe('get a course by id', () => {
    it('should return the course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/courses/show/${courseId}`)
        .expect(200);

      expect(res.body._id).toBe(courseId);
      expect(res.body.crs_title).toBe('E2E Course');
    });

    it('should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/courses/show/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('get courses by author', () => {
    it('should return the courses belonging to the author', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/courses/by/${userId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((c: any) => c._id === courseId)).toBe(true);
    });
  });

  describe('get course contents', () => {
    it('should return the sections, lessons and duration for the course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/courses/contents/${courseId}`)
        .expect(200);

      expect(res.body).toHaveProperty('courseContents');
    });
  });

  describe('update a course', () => {
    it('should update the course details', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .field('crs_title', 'E2E Course Updated')
        .field('crs_description', 'Updated description')
        .field('crs_price', '39.99')
        .field('level_id', '2')
        .field('category_id', categoryId)
        .expect(200);

      expect(res.body.crs_title).toBe('E2E Course Updated');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/courses/${courseId}`)
        .field('crs_title', 'Unauthorized Update')
        .expect(401);
    });
  });

  describe('delete a course', () => {
    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/courses/${courseId}`)
        .expect(401);
    });

    it('should delete the course', async () => {
      await request(app.getHttpServer())
        .delete(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      courseId = null;
    });
  });
});

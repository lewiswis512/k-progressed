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
import { Section } from '../../src/modules/learning/schemas/section.schema';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import { createApp } from './setup';

describe('Sections (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let categoryModel: Model<Category>;
  let courseModel: Model<Course>;
  let sectionModel: Model<Section>;
  let teacherModel: Model<Teacher>;
  let accessToken: string;
  let categoryId: string;
  let teacherId: string;
  let courseId: string;
  let sectionId: string;
  let userId: string;

  const testUser = {
    usr_username: 'sections_e2e',
    usr_email: 'sections_e2e@test.com',
    usr_password: 'Password123',
  };

  const fakeImage = Buffer.from('fake-image-content');

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));
    courseModel = moduleRef.get(getModelToken(Course.name));
    sectionModel = moduleRef.get(getModelToken(Section.name));
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
      .send({ ctgr_name: 'Sections E2E Category' });
    categoryId = catRes.body._id;

    const tchrRes = await request(app.getHttpServer())
      .post('/api/teachers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tchr_biography: 'E2E teacher bio', tchr_title: 'Sections E2E Teacher', user_id: userId });
    teacherId = tchrRes.body._id;

    const crsRes = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('crs_title', 'Sections E2E Course')
      .field('crs_description', 'Course for sections e2e tests')
      .field('crs_price', '19.99')
      .field('level_id', '1')
      .field('category_id', categoryId)
      .field('teacher_id', teacherId)
      .attach('file', fakeImage, { filename: 'course.jpg', contentType: 'image/jpeg' });
    courseId = crsRes.body._id;
  });

  afterAll(async () => {
    if (sectionId) await sectionModel.findByIdAndDelete(sectionId);
    if (courseId) await courseModel.findByIdAndDelete(courseId);
    if (teacherId) await teacherModel.findByIdAndDelete(teacherId);
    if (categoryId) await categoryModel.findByIdAndDelete(categoryId);
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('add a section', () => {
    it('should create a section for a course', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sections')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sect_title: 'E2E Section', course_id: courseId })
        .expect(201);

      sectionId = res.body._id;
      expect(res.body.sect_title).toBe('E2E Section');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/sections')
        .send({ sect_title: 'Unauthorized', course_id: courseId })
        .expect(401);
    });

    it('should return 400 when title is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/sections')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ course_id: courseId })
        .expect(400);
    });
  });

  describe('list sections', () => {
    it('should return the list of sections', async () => {
      const res = await request(app.getHttpServer()).get('/api/sections').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('get a section by id', () => {
    it('should return the section', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/sections/${sectionId}`)
        .expect(200);

      expect(res.body._id).toBe(sectionId);
      expect(res.body.sect_title).toBe('E2E Section');
    });

    it('should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/sections/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('get sections for a course', () => {
    it('should return the sections belonging to the course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/sections/course/${courseId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: any) => s._id === sectionId)).toBe(true);
    });
  });

  describe('update a section', () => {
    it('should update the section title', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/sections/${sectionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ sect_title: 'E2E Section Updated' })
        .expect(200);

      expect(res.body.sect_title).toBe('E2E Section Updated');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/sections/${sectionId}`)
        .send({ sect_title: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('delete a section', () => {
    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/sections/${sectionId}`)
        .expect(401);
    });

    it('should delete the section', async () => {
      await request(app.getHttpServer())
        .delete(`/api/sections/${sectionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      sectionId = null;
    });
  });
});

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
import { Lesson } from '../../src/modules/learning/schemas/lesson.schema';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import { Comment } from '../../src/modules/comments/schemas/comment.schema';
import { createApp } from '../learning/setup';

describe('Comments (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let categoryModel: Model<Category>;
  let courseModel: Model<Course>;
  let sectionModel: Model<Section>;
  let lessonModel: Model<Lesson>;
  let teacherModel: Model<Teacher>;
  let commentModel: Model<Comment>;

  let accessToken: string;
  let secondAccessToken: string;
  let userId: string;
  let categoryId: string;
  let teacherId: string;
  let courseId: string;
  let sectionId: string;
  let lessonId: string;
  let courseCommentId: string;
  let lessonCommentId: string;
  let replyCommentId: string;

  const testUser = {
    usr_username: 'comments_e2e',
    usr_email: 'comments_e2e@test.com',
    usr_password: 'Password123',
  };

  const secondUser = {
    usr_username: 'comments_e2e_2',
    usr_email: 'comments_e2e_2@test.com',
    usr_password: 'Password123',
  };

  const fakeImage = Buffer.from('fake-image-content');

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    categoryModel = moduleRef.get(getModelToken(Category.name));
    courseModel = moduleRef.get(getModelToken(Course.name));
    sectionModel = moduleRef.get(getModelToken(Section.name));
    lessonModel = moduleRef.get(getModelToken(Lesson.name));
    teacherModel = moduleRef.get(getModelToken(Teacher.name));
    commentModel = moduleRef.get(getModelToken(Comment.name));

    await userModel.deleteMany({
      usr_email: { $in: [testUser.usr_email, secondUser.usr_email] },
    });

    const signupRes = await request(app.getHttpServer()).post('/api/signup').send(testUser);
    userId = signupRes.body._id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });
    accessToken = loginRes.body.accessToken;

    await request(app.getHttpServer()).post('/api/signup').send(secondUser);
    const secondLoginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: secondUser.usr_email, usr_password: secondUser.usr_password });
    secondAccessToken = secondLoginRes.body.accessToken;

    const catRes = await request(app.getHttpServer())
      .post('/api/categories')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ctgr_name: 'Comments E2E Category' });
    categoryId = catRes.body._id;

    const tchrRes = await request(app.getHttpServer())
      .post('/api/teachers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ tchr_biography: 'E2E teacher bio', tchr_title: 'Comments E2E Teacher', user_id: userId });
    teacherId = tchrRes.body._id;

    const crsRes = await request(app.getHttpServer())
      .post('/api/courses')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('crs_title', 'Comments E2E Course')
      .field('crs_description', 'Course for comments e2e tests')
      .field('crs_price', '19.99')
      .field('level_id', '1')
      .field('category_id', categoryId)
      .field('teacher_id', teacherId)
      .attach('file', fakeImage, { filename: 'course.jpg', contentType: 'image/jpeg' });
    courseId = crsRes.body._id;

    const sectRes = await request(app.getHttpServer())
      .post('/api/sections')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sect_title: 'Comments E2E Section', course_id: courseId });
    sectionId = sectRes.body._id;

    const lesson = await lessonModel.create({
      _id: new Types.ObjectId(),
      lssn_title: 'Comments E2E Lesson',
      lssn_video_link: 'https://res.cloudinary.com/test/video/upload/lesson.mp4',
      lssn_video_photo: 'https://res.cloudinary.com/test/image/upload/thumb.jpg',
      lssn_is_free: true,
      lssn_duration: '03:45',
      section: new Types.ObjectId(sectionId),
    });
    lessonId = lesson._id.toString();
  });

  afterAll(async () => {
    if (replyCommentId) await commentModel.findByIdAndDelete(replyCommentId);
    if (lessonCommentId) await commentModel.findByIdAndDelete(lessonCommentId);
    if (courseCommentId) await commentModel.findByIdAndDelete(courseCommentId);
    if (lessonId) await lessonModel.findByIdAndDelete(lessonId);
    if (sectionId) await sectionModel.findByIdAndDelete(sectionId);
    if (courseId) await courseModel.findByIdAndDelete(courseId);
    if (teacherId) await teacherModel.findByIdAndDelete(teacherId);
    if (categoryId) await categoryModel.findByIdAndDelete(categoryId);
    await userModel.deleteMany({
      usr_email: { $in: [testUser.usr_email, secondUser.usr_email] },
    });
    await app.close();
  });

  describe('add a comment on a course', () => {
    it('should create a comment with rating and content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/comments/course')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comm_rating: 4, comm_content: 'Great course!', comment_id: null, course_id: courseId })
        .expect(201);

      courseCommentId = res.body._id;
      expect(res.body.comm_content).toBe('Great course!');
      expect(res.body.comm_rating).toBe(4);
      expect(res.body.comm_count_like).toBe(0);
      expect(res.body.comm_count_dislike).toBe(0);
    });

    it('should return 400 when content is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/comments/course')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comm_rating: 4, comment_id: null, course_id: courseId })
        .expect(400);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/comments/course')
        .send({ comm_rating: 4, comm_content: 'Unauthorized', comment_id: null, course_id: courseId })
        .expect(401);
    });
  });

  describe('add a comment on a lesson', () => {
    it('should create a comment with content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/comments/lesson')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comm_content: 'Great lesson!', comment_id: null, lesson_id: lessonId })
        .expect(201);

      lessonCommentId = res.body._id;
      expect(res.body.comm_content).toBe('Great lesson!');
    });

    it('should return 400 when content is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/comments/lesson')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comment_id: null, lesson_id: lessonId })
        .expect(400);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/comments/lesson')
        .send({ comm_content: 'Unauthorized', comment_id: null, lesson_id: lessonId })
        .expect(401);
    });
  });

  describe('get comments by course', () => {
    it('should return the comments and total count for the course', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/comments/by/course/${courseId}`)
        .expect(200);

      expect(res.body).toHaveProperty('comments');
      expect(res.body).toHaveProperty('totalComments');
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.totalComments).toBeGreaterThanOrEqual(1);
    });
  });

  describe('get comments by lesson', () => {
    it('should return the comments and total count for the lesson', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/comments/by/lesson/${lessonId}`)
        .expect(200);

      expect(res.body).toHaveProperty('comments');
      expect(res.body).toHaveProperty('totalComments');
      expect(Array.isArray(res.body.comments)).toBe(true);
      expect(res.body.totalComments).toBeGreaterThanOrEqual(1);
    });
  });

  describe('get a comment by id', () => {
    it('should return the comment', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/comments/${courseCommentId}`)
        .expect(200);

      expect(res.body._id).toBe(courseCommentId);
      expect(res.body.comm_content).toBe('Great course!');
    });

    it('should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/comments/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('reply to a comment', () => {
    it('should add a reply to the course comment', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/comments/course')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          comm_rating: 5,
          comm_content: 'I agree, excellent!',
          comment_id: courseCommentId,
          course_id: courseId,
        })
        .expect(201);

      replyCommentId = res.body._id;
      expect(res.body.comm_content).toBe('I agree, excellent!');
      expect(res.body.parent_comment).toBe(courseCommentId);
    });
  });

  describe('update a course comment', () => {
    it('should update the content and rating', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/comments/course/${courseCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comm_rating: 5, comm_content: 'Amazing course, updated review!' })
        .expect(200);

      expect(res.body.comm_content).toBe('Amazing course, updated review!');
      expect(res.body.comm_rating).toBe(5);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/comments/course/${courseCommentId}`)
        .send({ comm_rating: 3, comm_content: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('update a lesson comment', () => {
    it('should update the content', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/comments/lesson/${lessonCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comm_content: 'Fantastic lesson, updated!' })
        .expect(200);

      expect(res.body.comm_content).toBe('Fantastic lesson, updated!');
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/comments/lesson/${lessonCommentId}`)
        .send({ comm_content: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('like a comment', () => {
    it('should increment the like count', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/comments/like/${courseCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.comm_count_like).toBe(1);
    });

    it('should remove the like when called again (toggle)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/comments/like/${courseCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.comm_count_like).toBe(0);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/comments/like/${courseCommentId}`)
        .expect(401);
    });
  });

  describe('dislike a comment', () => {
    it('should increment the dislike count', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/comments/dislike/${courseCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.comm_count_dislike).toBe(1);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/comments/dislike/${courseCommentId}`)
        .expect(401);
    });
  });

  describe('delete a comment', () => {
    it('should return 403 when trying to delete another user comment', async () => {
      await request(app.getHttpServer())
        .delete(`/api/comments/${courseCommentId}`)
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .expect(403);
    });

    it('should delete the comment', async () => {
      await request(app.getHttpServer())
        .delete(`/api/comments/${courseCommentId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      courseCommentId = null;
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .delete(`/api/comments/${lessonCommentId}`)
        .expect(401);
    });
  });
});

import { Types } from 'mongoose';
import request from 'supertest';
import { CourseStatusEnum } from '../../src/utils/enums/course-status.enum';
import { cloudinaryVideoMock } from '../utils/cloudinary-mock';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, FAKE_MP4, Fixtures, ITestUser } from '../utils/fixtures';

describe('Lessons (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let teacher: ITestUser & { teacherId: string };
  let otherTeacher: ITestUser & { teacherId: string };
  let student: ITestUser;
  let buyer: ITestUser;
  let superAdmin: ITestUser;
  let courseId: string;
  let sectionId: string;
  let lessonId: string;
  let freeLessonId: string;
  let pendingFreeLessonId: string;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    teacher = await fixtures.createTeacher('lssn_teacher');
    otherTeacher = await fixtures.createTeacher('lssn_other');
    student = await fixtures.createUser('lssn_student');
    buyer = await fixtures.createUser('lssn_buyer');
    superAdmin = await fixtures.createSuperAdmin('lssn_super');
    courseId = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
    });
    sectionId = await fixtures.createSection(courseId);
    freeLessonId = await fixtures.createLesson(sectionId, { isFree: true });
    await fixtures.createPurchase(buyer, [courseId]);

    const pendingCourse = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
      status: CourseStatusEnum.PENDING,
    });
    pendingFreeLessonId = await fixtures.createLesson(
      await fixtures.createSection(pendingCourse),
      { isFree: true },
    );
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  const addLesson = (user: ITestUser) =>
    request(testApp.http)
      .post('/api/lessons')
      .set(bearer(user))
      .field('lssn_title', 'E2E Lesson')
      .field('lssn_is_free', 'false')
      .field('section_id', sectionId);

  describe('add a lesson', () => {
    it('should upload the video through the mocked strategy and create the lesson', async () => {
      const res = await addLesson(teacher)
        .attach('file', FAKE_MP4, {
          filename: 'lesson.mp4',
          contentType: 'video/mp4',
        })
        .expect(201);

      lessonId = res.body._id;
      expect(cloudinaryVideoMock.upload).toHaveBeenCalled();
      expect(res.body.lssn_video_link).toMatch(
        /^https:\/\/res\.cloudinary\.com\/test-cloud\//,
      );
      expect(res.body.lssn_is_free).toBe(false);
      expect(res.body.lssn_duration).toBeDefined();
    });

    it("should return 403 when adding a lesson to someone else's course", async () => {
      cloudinaryVideoMock.upload.mockClear();

      await addLesson(otherTeacher)
        .attach('file', FAKE_MP4, {
          filename: 'lesson.mp4',
          contentType: 'video/mp4',
        })
        .expect(403);
      expect(cloudinaryVideoMock.upload).not.toHaveBeenCalled();
    });

    it('should return 422 without a video', async () => {
      await addLesson(teacher).expect(422);
    });

    it('should return 422 when the video is not really a video', async () => {
      await addLesson(teacher)
        .attach('file', Buffer.from('plain text pretending to be a video'), {
          filename: 'lesson.mp4',
          contentType: 'video/mp4',
        })
        .expect(422);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/lessons')
        .field('lssn_title', 'x')
        .expect(401);
    });
  });

  describe('list lessons', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http).get('/api/lessons').expect(401);
    });

    it('should return 403 for a teacher', async () => {
      await request(testApp.http)
        .get('/api/lessons')
        .set(bearer(teacher))
        .expect(403);
    });

    it('should return every lesson to the super admin', async () => {
      const res = await request(testApp.http)
        .get('/api/lessons')
        .set(bearer(superAdmin))
        .expect(200);

      expect(res.body.some((l: { _id: string }) => l._id === lessonId)).toBe(
        true,
      );
    });

    it('should list the free lessons of a course publicly', async () => {
      const res = await request(testApp.http)
        .get(`/api/lessons/free/${courseId}`)
        .expect(200);

      expect(res.body.map((l: { _id: string }) => l._id)).toEqual([
        freeLessonId,
      ]);
    });
  });

  describe('get a lesson by id', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http).get(`/api/lessons/${lessonId}`).expect(401);
    });

    it('should return 403 on a paid lesson for a student who did not buy', async () => {
      await request(testApp.http)
        .get(`/api/lessons/${lessonId}`)
        .set(bearer(student))
        .expect(403);
    });

    it('should return 403 on a paid lesson for another teacher', async () => {
      await request(testApp.http)
        .get(`/api/lessons/${lessonId}`)
        .set(bearer(otherTeacher))
        .expect(403);
    });

    it.each([
      ['the buyer', () => buyer],
      ['the author', () => teacher],
      ['the super admin', () => superAdmin],
    ])('should return the paid lesson to %s', async (_label, who) => {
      const res = await request(testApp.http)
        .get(`/api/lessons/${lessonId}`)
        .set(bearer(who()))
        .expect(200);

      expect(res.body._id).toBe(lessonId);
      expect(res.body.lssn_video_link).toBeTruthy();
    });

    it('should return a free lesson of a published course to any user', async () => {
      await request(testApp.http)
        .get(`/api/lessons/${freeLessonId}`)
        .set(bearer(student))
        .expect(200);
    });

    it('should return 403 on a free lesson of an unpublished course', async () => {
      await request(testApp.http)
        .get(`/api/lessons/${pendingFreeLessonId}`)
        .set(bearer(student))
        .expect(403);
      await request(testApp.http)
        .get(`/api/lessons/${pendingFreeLessonId}`)
        .set(bearer(teacher))
        .expect(200);
    });

    it('should return 404 for an unknown id', async () => {
      await request(testApp.http)
        .get(`/api/lessons/${new Types.ObjectId()}`)
        .set(bearer(teacher))
        .expect(404);
    });
  });

  describe('update a lesson', () => {
    it('should return 403 for another teacher', async () => {
      await request(testApp.http)
        .patch(`/api/lessons/${lessonId}`)
        .set(bearer(otherTeacher))
        .field('lssn_title', 'Hijacked')
        .field('lssn_is_free', 'true')
        .expect(403);
    });

    it('should return 403 for a buyer', async () => {
      await request(testApp.http)
        .patch(`/api/lessons/${lessonId}`)
        .set(bearer(buyer))
        .field('lssn_title', 'Hijacked')
        .field('lssn_is_free', 'true')
        .expect(403);
    });

    it('should update the lesson for its author', async () => {
      const res = await request(testApp.http)
        .patch(`/api/lessons/${lessonId}`)
        .set(bearer(teacher))
        .field('lssn_title', 'E2E Lesson Updated')
        .field('lssn_is_free', 'true')
        .expect(200);

      expect(res.body.lssn_title).toBe('E2E Lesson Updated');
      expect(res.body.lssn_is_free).toBe(true);
    });
  });

  describe('delete a lesson', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .delete(`/api/lessons/${lessonId}`)
        .expect(401);
    });

    it('should return 403 for another teacher', async () => {
      await request(testApp.http)
        .delete(`/api/lessons/${lessonId}`)
        .set(bearer(otherTeacher))
        .expect(403);
    });

    it('should delete the lesson and its media', async () => {
      cloudinaryVideoMock.delete.mockClear();

      await request(testApp.http)
        .delete(`/api/lessons/${lessonId}`)
        .set(bearer(teacher))
        .expect(204);

      expect(cloudinaryVideoMock.delete).toHaveBeenCalled();
      await request(testApp.http)
        .get(`/api/lessons/${lessonId}`)
        .set(bearer(teacher))
        .expect(404);
    });
  });
});

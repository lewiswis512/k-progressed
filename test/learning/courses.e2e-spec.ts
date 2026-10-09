import { Types } from 'mongoose';
import request from 'supertest';
import { Course } from '../../src/modules/learning/schemas/course.schema';
import { CourseStatusEnum } from '../../src/utils/enums/course-status.enum';
import { cloudinaryPhotoMock } from '../utils/cloudinary-mock';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, FAKE_JPEG, Fixtures, ITestUser } from '../utils/fixtures';

interface ILessonBody {
  _id: string;
  lssn_video_link: string;
}

describe('Courses (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let teacher: ITestUser & { teacherId: string };
  let otherTeacher: ITestUser & { teacherId: string };
  let student: ITestUser;
  let buyer: ITestUser;
  let superAdmin: ITestUser;
  let categoryId: string;
  let courseId: string;

  const courseFields = (req: request.Test, title = 'E2E Course') =>
    req
      .field('crs_title', title)
      .field('crs_description', 'End-to-end test course description')
      .field('crs_price', '29.99')
      .field('level_id', '1')
      .field('category_id', categoryId);

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    teacher = await fixtures.createTeacher('crs_teacher');
    otherTeacher = await fixtures.createTeacher('crs_other');
    student = await fixtures.createUser('crs_student');
    buyer = await fixtures.createUser('crs_buyer');
    superAdmin = await fixtures.createSuperAdmin('crs_super');
    categoryId = await fixtures.createCategory('Courses E2E Category');
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('add a course', () => {
    it('should create a pending course and ignore forged fields', async () => {
      const res = await courseFields(
        request(testApp.http).post('/api/courses').set(bearer(teacher)),
      )
        .field('crs_status', String(CourseStatusEnum.VALIDATED))
        .field('author', otherTeacher.id)
        .field('crs_isPaid', 'true')
        .attach('file', FAKE_JPEG, {
          filename: 'course.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      courseId = res.body._id;
      expect(res.body.crs_title).toBe('E2E Course');
      expect(res.body.crs_price).toBe(29.99);
      expect(res.body.crs_status).toBe(CourseStatusEnum.PENDING);
      expect(String(res.body.author)).toBe(teacher.id);
      expect(res.body.teacher._id).toBe(teacher.teacherId);
      expect(res.body.crs_photo).toMatch(
        /^https:\/\/res\.cloudinary\.com\/test-cloud\//,
      );
      expect(cloudinaryPhotoMock.upload).toHaveBeenCalled();
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/courses')
        .field('crs_title', 'x')
        .expect(401);
    });

    it('should return 403 for a student', async () => {
      await courseFields(
        request(testApp.http).post('/api/courses').set(bearer(student)),
      )
        .attach('file', FAKE_JPEG, {
          filename: 'course.jpg',
          contentType: 'image/jpeg',
        })
        .expect(403);
    });

    it('should return 422 when the cover image is missing', async () => {
      await courseFields(
        request(testApp.http).post('/api/courses').set(bearer(teacher)),
      ).expect(422);
    });

    it('should return 422 when the cover is not really an image', async () => {
      await courseFields(
        request(testApp.http).post('/api/courses').set(bearer(teacher)),
      )
        .attach('file', Buffer.from('this is definitely not a jpeg file'), {
          filename: 'course.jpg',
          contentType: 'image/jpeg',
        })
        .expect(422);
    });

    it('should return 400 for an invalid price', async () => {
      await request(testApp.http)
        .post('/api/courses')
        .set(bearer(teacher))
        .field('crs_title', 'Bad price')
        .field('crs_description', 'Description')
        .field('crs_price', '-5')
        .field('level_id', '1')
        .field('category_id', categoryId)
        .attach('file', FAKE_JPEG, {
          filename: 'course.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);
    });
  });

  describe('visibility of a pending course', () => {
    it('should hide it from the public list', async () => {
      const res = await request(testApp.http)
        .get('/api/courses?q=E2E Course')
        .expect(200);

      expect(
        res.body.data.some(
          (c: { course: { _id: string } }) => c.course._id === courseId,
        ),
      ).toBe(false);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .get(`/api/courses/show/${courseId}`)
        .expect(401);
      await request(testApp.http)
        .get(`/api/courses/view/${courseId}`)
        .expect(401);
      await request(testApp.http)
        .get(`/api/courses/contents/${courseId}`)
        .expect(401);
      await request(testApp.http)
        .get(`/api/courses/by/${teacher.id}`)
        .expect(401);
    });

    it('should return 404 to other users', async () => {
      await request(testApp.http)
        .get(`/api/courses/show/${courseId}`)
        .set(bearer(student))
        .expect(404);
      await request(testApp.http)
        .get(`/api/courses/contents/${courseId}`)
        .set(bearer(student))
        .expect(404);
    });

    it('should be visible to its author and the super admin', async () => {
      await request(testApp.http)
        .get(`/api/courses/show/${courseId}`)
        .set(bearer(teacher))
        .expect(200);
      await request(testApp.http)
        .get(`/api/courses/show/${courseId}`)
        .set(bearer(superAdmin))
        .expect(200);
    });

    it('should list it in the author courses only for the author', async () => {
      const own = await request(testApp.http)
        .get(`/api/courses/by/${teacher.id}`)
        .set(bearer(teacher))
        .expect(200);
      const other = await request(testApp.http)
        .get(`/api/courses/by/${teacher.id}`)
        .set(bearer(student))
        .expect(200);

      expect(own.body.some((c: { _id: string }) => c._id === courseId)).toBe(
        true,
      );
      expect(other.body.some((c: { _id: string }) => c._id === courseId)).toBe(
        false,
      );
    });
  });

  describe('course status', () => {
    it('should return 401 on the admin list without a token', async () => {
      await request(testApp.http).get('/api/courses/admin').expect(401);
    });

    it('should return 403 on the admin list for a teacher', async () => {
      await request(testApp.http)
        .get('/api/courses/admin')
        .set(bearer(teacher))
        .expect(403);
    });

    it('should list every course for the super admin', async () => {
      const res = await request(testApp.http)
        .get('/api/courses/admin?q=E2E Course&page=1&limit=5')
        .set(bearer(superAdmin))
        .expect(200);

      expect(res.body).toMatchObject({ page: 1, limit: 5 });
      const course = res.body.data.find(
        (c: {
          _id: string;
          crs_status: CourseStatusEnum;
          author: { usr_username: string };
        }) => c._id === courseId,
      );
      expect(course.crs_status).toBe(CourseStatusEnum.PENDING);
      expect(course.author.usr_username).toBe(teacher.username);
      expect(course.author).not.toHaveProperty('usr_password');
    });

    it('should return 400 for an invalid status filter', async () => {
      await request(testApp.http)
        .get('/api/courses/admin?status=9')
        .set(bearer(superAdmin))
        .expect(400);
    });

    it('should return 403 when the author validates their own course', async () => {
      await request(testApp.http)
        .patch(`/api/courses/${courseId}/status`)
        .set(bearer(teacher))
        .send({ crs_status: CourseStatusEnum.VALIDATED })
        .expect(403);
    });

    it('should return 400 for an invalid status', async () => {
      await request(testApp.http)
        .patch(`/api/courses/${courseId}/status`)
        .set(bearer(superAdmin))
        .send({ crs_status: 7 })
        .expect(400);
    });

    it('should validate the course', async () => {
      const res = await request(testApp.http)
        .patch(`/api/courses/${courseId}/status`)
        .set(bearer(superAdmin))
        .send({ crs_status: CourseStatusEnum.VALIDATED })
        .expect(200);

      expect(res.body.crs_status).toBe(CourseStatusEnum.VALIDATED);
    });

    it('should show the validated course to any logged-in user', async () => {
      const list = await request(testApp.http)
        .get('/api/courses?q=E2E Course&limit=50')
        .expect(200);

      expect(
        list.body.data.some(
          (c: { course: { _id: string } }) => c.course._id === courseId,
        ),
      ).toBe(true);
      await request(testApp.http)
        .get(`/api/courses/show/${courseId}`)
        .set(bearer(student))
        .expect(200);
    });

    it('should treat the search as plain text', async () => {
      const res = await request(testApp.http)
        .get(`/api/courses?q=${encodeURIComponent('.*')}`)
        .expect(200);

      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('course contents and paid lessons', () => {
    let freeLessonId: string;
    let paidLessonId: string;

    beforeAll(async () => {
      const sectionId = await fixtures.createSection(courseId, 'Intro');
      freeLessonId = await fixtures.createLesson(sectionId, { isFree: true });
      paidLessonId = await fixtures.createLesson(sectionId, { isFree: false });
      await fixtures.createPurchase(buyer, [courseId]);
    });

    it('should hide the video link of paid lessons to a user who has not bought the course', async () => {
      const res = await request(testApp.http)
        .get(`/api/courses/contents/${courseId}`)
        .set(bearer(student))
        .expect(200);
      const lessons = res.body.courseContents[0].lessons;

      expect(
        lessons.find((l: ILessonBody) => l._id === paidLessonId)
          .lssn_video_link,
      ).toBe('');
      expect(
        lessons.find((l: ILessonBody) => l._id === freeLessonId)
          .lssn_video_link,
      ).not.toBe('');
      expect(res.body.totalLessons).toBe(2);
    });

    it('should return 401 on view-lessons without a token', async () => {
      await request(testApp.http)
        .get(`/api/courses/view-lessons/${courseId}`)
        .expect(401);
    });

    it('should return 403 on view-lessons for a student who did not buy', async () => {
      await request(testApp.http)
        .get(`/api/courses/view-lessons/${courseId}`)
        .set(bearer(student))
        .expect(403);
    });

    it('should return 403 when the purchase is not paid', async () => {
      await fixtures.createPurchase(student, [courseId], { paid: false });

      await request(testApp.http)
        .get(`/api/courses/view-lessons/${courseId}`)
        .set(bearer(student))
        .expect(403);
    });

    it.each([
      ['the buyer', () => buyer],
      ['the author', () => teacher],
      ['the super admin', () => superAdmin],
    ])('should return every video link to %s', async (_label, who) => {
      const res = await request(testApp.http)
        .get(`/api/courses/view-lessons/${courseId}`)
        .set(bearer(who()))
        .expect(200);

      expect(
        res.body.courseContents[0].lessons.every(
          (l: ILessonBody) => l.lssn_video_link !== '',
        ),
      ).toBe(true);
    });
  });

  describe('update a course', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch(`/api/courses/${courseId}`)
        .field('crs_title', 'Unauthorized Update')
        .expect(401);
    });

    it('should return 403 when another teacher updates the course', async () => {
      await request(testApp.http)
        .patch(`/api/courses/${courseId}`)
        .set(bearer(otherTeacher))
        .field('crs_title', 'Hijacked')
        .expect(403);
    });

    it('should return 403 when a buyer updates the course', async () => {
      await request(testApp.http)
        .patch(`/api/courses/${courseId}`)
        .set(bearer(buyer))
        .field('crs_price', '0')
        .expect(403);
    });

    it('should update the course details without touching the status', async () => {
      const res = await request(testApp.http)
        .patch(`/api/courses/${courseId}`)
        .set(bearer(teacher))
        .field('crs_title', 'E2E Course Updated')
        .field('crs_price', '39.99')
        .field('crs_status', String(CourseStatusEnum.REJECTED))
        .field('author', otherTeacher.id)
        .expect(200);

      expect(res.body.crs_title).toBe('E2E Course Updated');
      expect(res.body.crs_slug).toBe('e2e-course-updated');
      expect(res.body.crs_price).toBe(39.99);
      expect(res.body.crs_status).toBe(CourseStatusEnum.VALIDATED);
      expect(String(res.body.author)).toBe(teacher.id);
    });

    it('should put a rejected course back to pending when the author edits it', async () => {
      const rejected = await fixtures.createCourse({
        authorId: teacher.id,
        teacherId: teacher.teacherId,
        status: CourseStatusEnum.REJECTED,
      });

      const res = await request(testApp.http)
        .patch(`/api/courses/${rejected}`)
        .set(bearer(teacher))
        .field('crs_description', 'Fixed description')
        .expect(200);

      expect(res.body.crs_status).toBe(CourseStatusEnum.PENDING);
    });

    it('should let the super admin update any course', async () => {
      await request(testApp.http)
        .patch(`/api/courses/${courseId}`)
        .set(bearer(superAdmin))
        .field('crs_description', 'Moderated description')
        .expect(200);
    });
  });

  describe('delete a course', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .delete(`/api/courses/${courseId}`)
        .expect(401);
    });

    it('should return 403 when another teacher deletes the course', async () => {
      await request(testApp.http)
        .delete(`/api/courses/${courseId}`)
        .set(bearer(otherTeacher))
        .expect(403);
    });

    it('should return 400 when the author deletes a purchased course', async () => {
      await request(testApp.http)
        .delete(`/api/courses/${courseId}`)
        .set(bearer(teacher))
        .expect(400);
    });

    it('should delete an unpurchased course with its sections and lessons', async () => {
      const draft = await fixtures.createCourse({
        authorId: teacher.id,
        teacherId: teacher.teacherId,
      });
      const sectionId = await fixtures.createSection(draft);
      await fixtures.createLesson(sectionId);

      await request(testApp.http)
        .delete(`/api/courses/${draft}`)
        .set(bearer(teacher))
        .expect(204);

      expect(
        await fixtures.model<Course>(Course.name).findById(draft),
      ).toBeNull();
      expect(
        await fixtures
          .model('Section')
          .countDocuments({ course: new Types.ObjectId(draft) }),
      ).toBe(0);
    });

    it('should let the super admin delete a purchased course', async () => {
      await request(testApp.http)
        .delete(`/api/courses/${courseId}`)
        .set(bearer(superAdmin))
        .expect(204);
    });
  });
});

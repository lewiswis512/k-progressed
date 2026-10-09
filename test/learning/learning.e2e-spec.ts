import request from 'supertest';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';

describe('Learning progress and certificates (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let teacher: ITestUser & { teacherId: string };
  let buyer: ITestUser;
  let student: ITestUser;
  let courseId: string;
  let otherCourseId: string;
  let lessonIds: string[];
  let certificateNumber: string;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    teacher = await fixtures.createTeacher('prog_teacher');
    buyer = await fixtures.createUser('prog_buyer');
    student = await fixtures.createUser('prog_student');
    await fixtures.users.updateOne(
      { _id: buyer.id },
      { usr_firstname: 'Ada', usr_lastname: 'Lovelace' },
    );

    courseId = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
      title: 'Progress Course',
    });
    otherCourseId = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
    });
    const sectionId = await fixtures.createSection(courseId);
    lessonIds = [
      await fixtures.createLesson(sectionId, { isFree: true }),
      await fixtures.createLesson(sectionId),
    ];
    await fixtures.createPurchase(buyer, [courseId]);
    await fixtures.createPurchase(student, [otherCourseId], { paid: false });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/learning', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http).get('/api/learning').expect(401);
    });

    it('should list only the paid courses with their progress', async () => {
      const res = await request(testApp.http)
        .get('/api/learning')
        .set(bearer(buyer))
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].course._id).toBe(courseId);
      expect(res.body[0].course.author.usr_username).toBe(teacher.username);
      expect(res.body[0].course.author).not.toHaveProperty('usr_email');
      expect(res.body[0].progress).toMatchObject({
        completedLessons: 0,
        totalLessons: 2,
        percent: 0,
      });
    });

    it('should not list an unpaid purchase', async () => {
      const res = await request(testApp.http)
        .get('/api/learning')
        .set(bearer(student))
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('lesson progress', () => {
    it('should return 403 when a student who did not buy completes a lesson', async () => {
      await request(testApp.http)
        .post(`/api/progress/lessons/${lessonIds[1]}`)
        .set(bearer(student))
        .expect(403);
    });

    it('should complete a lesson and be idempotent', async () => {
      await request(testApp.http)
        .post(`/api/progress/lessons/${lessonIds[0]}`)
        .set(bearer(buyer))
        .expect(201);
      const res = await request(testApp.http)
        .post(`/api/progress/lessons/${lessonIds[0]}`)
        .set(bearer(buyer))
        .expect(201);

      expect(res.body).toMatchObject({
        courseId,
        completedLessonIds: [lessonIds[0]],
        completedLessons: 1,
        percent: 50,
      });
    });

    it('should return 400 for a certificate before the course is complete', async () => {
      await request(testApp.http)
        .post(`/api/certificates/courses/${courseId}`)
        .set(bearer(buyer))
        .expect(400);
    });

    it('should uncomplete a lesson', async () => {
      const res = await request(testApp.http)
        .delete(`/api/progress/lessons/${lessonIds[0]}`)
        .set(bearer(buyer))
        .expect(200);

      expect(res.body.completedLessons).toBe(0);
    });

    it('should return the progress of a course', async () => {
      await Promise.all(
        lessonIds.map((id) =>
          request(testApp.http)
            .post(`/api/progress/lessons/${id}`)
            .set(bearer(buyer))
            .expect(201),
        ),
      );

      const res = await request(testApp.http)
        .get(`/api/progress/courses/${courseId}`)
        .set(bearer(buyer))
        .expect(200);

      expect(res.body.percent).toBe(100);
      expect(res.body.certificateNumber).toBeNull();
    });

    it('should keep the progress of each user separate', async () => {
      const res = await request(testApp.http)
        .get(`/api/progress/courses/${courseId}`)
        .set(bearer(student))
        .expect(200);

      expect(res.body.completedLessons).toBe(0);
    });
  });

  describe('certificates', () => {
    it('should return 403 for a student who did not buy the course', async () => {
      await request(testApp.http)
        .post(`/api/certificates/courses/${courseId}`)
        .set(bearer(student))
        .expect(403);
    });

    it('should issue the certificate once the course is complete', async () => {
      const res = await request(testApp.http)
        .post(`/api/certificates/courses/${courseId}`)
        .set(bearer(buyer))
        .expect(201);

      certificateNumber = res.body.cert_number;
      expect(certificateNumber).toMatch(/^KP-[0-9A-F]{12}$/);
      expect(res.body.cert_student_name).toBe('Ada Lovelace');
      expect(res.body.cert_course_title).toBe('Progress Course');
    });

    it('should return the same certificate on a second request', async () => {
      const res = await request(testApp.http)
        .post(`/api/certificates/courses/${courseId}`)
        .set(bearer(buyer))
        .expect(201);

      expect(res.body.cert_number).toBe(certificateNumber);
    });

    it('should verify a certificate publicly without private data', async () => {
      const res = await request(testApp.http)
        .get(`/api/certificates/${certificateNumber}`)
        .expect(200);

      expect(res.body.cert_student_name).toBe('Ada Lovelace');
      expect(res.body).not.toHaveProperty('user');
    });

    it('should return 404 for an unknown certificate', async () => {
      await request(testApp.http).get('/api/certificates/KP-000000000000').expect(404);
    });
  });
});

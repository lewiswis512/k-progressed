import request from 'supertest';
import { Course } from '../src/modules/learning/schemas/course.schema';
import { Lesson } from '../src/modules/learning/schemas/lesson.schema';
import { User } from '../src/modules/users/schemas/user.schema';
import { CourseStatusEnum } from '../src/utils/enums/course-status.enum';
import { createApp, ITestApp } from './utils/create-app';
import { bearer, Fixtures, ITestUser } from './utils/fixtures';

describe('Admin (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let student: ITestUser;
  let teacher: ITestUser & { teacherId: string };
  let superAdmin: ITestUser;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    student = await fixtures.createUser('admin_student');
    teacher = await fixtures.createTeacher('admin_teacher');
    superAdmin = await fixtures.createSuperAdmin('admin_super');

    const paidCourse = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
      price: 20,
      title: 'Admin Stats Course',
    });
    await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
      status: CourseStatusEnum.PENDING,
    });
    await fixtures.createPurchase(student, [paidCourse]);
    await fixtures.createPurchase(student, [paidCourse], { paid: false });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('should return 401 without a token', async () => {
    await request(testApp.http).get('/api/admin/stats').expect(401);
  });

  it('should return 403 for a student and a teacher', async () => {
    await request(testApp.http)
      .get('/api/admin/stats')
      .set(bearer(student))
      .expect(403);
    await request(testApp.http)
      .get('/api/admin/stats')
      .set(bearer(teacher))
      .expect(403);
  });

  it('should return the platform statistics to the super admin', async () => {
    const res = await request(testApp.http)
      .get('/api/admin/stats')
      .set(bearer(superAdmin))
      .expect(200);

    expect(res.body.revenue).toEqual({ allTime: 20, last30Days: 20 });
    expect(res.body.orders).toMatchObject({
      allTime: 1,
      last30Days: 1,
      refunded: 0,
    });
    expect(res.body.users).toMatchObject({ total: 3, teachers: 1 });
    expect(res.body.courses).toEqual({ pending: 1, validated: 1, rejected: 0 });
    expect(res.body.topCourses[0]).toMatchObject({
      title: 'Admin Stats Course',
      sales: 1,
      revenue: 20,
    });
    expect(res.body.salesByDay).toHaveLength(1);
  });

  describe('POST /api/load-data', () => {
    const confirmation = { confirmation: 'LOAD DATA' };

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/load-data')
        .send(confirmation)
        .expect(401);
    });

    it('should return 403 for a student and a teacher', async () => {
      await request(testApp.http)
        .post('/api/load-data')
        .set(bearer(student))
        .send(confirmation)
        .expect(403);
      await request(testApp.http)
        .post('/api/load-data')
        .set(bearer(teacher))
        .send(confirmation)
        .expect(403);
    });

    it('should return 400 without the confirmation', async () => {
      await request(testApp.http)
        .post('/api/load-data')
        .set(bearer(superAdmin))
        .send({ confirmation: 'yes' })
        .expect(400);
    });

    it('should not delete anything when SEED_PASSWORD is missing', async () => {
      delete process.env.SEED_PASSWORD;

      const res = await request(testApp.http)
        .post('/api/load-data')
        .set(bearer(superAdmin))
        .send(confirmation)
        .expect(500);

      expect(res.body.message).toContain('SEED_PASSWORD');
      expect(await fixtures.model<User>(User.name).countDocuments()).toBe(3);
    });

    it('should replace the data with the seed for the super admin', async () => {
      process.env.SEED_PASSWORD = 'seed-password-for-tests';
      process.env.SEED_SUPERADMIN_EMAIL = 'seed-admin@k-progressed.test';

      const res = await request(testApp.http)
        .post('/api/load-data')
        .set(bearer(superAdmin))
        .send(confirmation)
        .expect(200);

      expect(res.body).toEqual({
        status: 'success',
        superAdminEmail: 'seed-admin@k-progressed.test',
      });

      const users = fixtures.model<User>(User.name);
      expect(await users.countDocuments({ usr_email: superAdmin.email })).toBe(
        0,
      );
      expect(
        await users.countDocuments({
          usr_email: 'seed-admin@k-progressed.test',
        }),
      ).toBe(1);
      expect(
        await fixtures.model<Course>(Course.name).countDocuments(),
      ).toBeGreaterThan(0);
      expect(
        await fixtures.model<Lesson>(Lesson.name).countDocuments(),
      ).toBeGreaterThan(0);

      await request(testApp.http)
        .get('/api/admin/stats')
        .set(bearer(superAdmin))
        .expect(401);
    });
  });
});

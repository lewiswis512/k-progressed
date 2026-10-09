import { Types } from 'mongoose';
import request from 'supertest';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';

describe('Categories (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let superAdmin: ITestUser;
  let teacher: ITestUser & { teacherId: string };
  let student: ITestUser;
  let categoryId: string;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    superAdmin = await fixtures.createSuperAdmin('cat_super');
    teacher = await fixtures.createTeacher('cat_teacher');
    student = await fixtures.createUser('cat_student');
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('add a category', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/categories')
        .send({ ctgr_name: 'Unauthorized' })
        .expect(401);
    });

    it('should return 403 for a student', async () => {
      await request(testApp.http)
        .post('/api/categories')
        .set(bearer(student))
        .send({ ctgr_name: 'Student Category' })
        .expect(403);
    });

    it('should return 403 for a teacher', async () => {
      await request(testApp.http)
        .post('/api/categories')
        .set(bearer(teacher))
        .send({ ctgr_name: 'Teacher Category' })
        .expect(403);
    });

    it('should create a category for the super admin', async () => {
      const res = await request(testApp.http)
        .post('/api/categories')
        .set(bearer(superAdmin))
        .send({ ctgr_name: 'E2E Category' })
        .expect(201);

      categoryId = res.body._id;
      expect(res.body.ctgr_name).toBe('E2E Category');
    });

    it('should return 409 for a duplicate name with another case', async () => {
      await request(testApp.http)
        .post('/api/categories')
        .set(bearer(superAdmin))
        .send({ ctgr_name: 'e2e category' })
        .expect(409);
    });

    it('should return 400 when name is missing', async () => {
      await request(testApp.http)
        .post('/api/categories')
        .set(bearer(superAdmin))
        .send({})
        .expect(400);
    });
  });

  describe('read categories', () => {
    it('should return the list of categories publicly', async () => {
      const res = await request(testApp.http)
        .get('/api/categories')
        .expect(200);

      expect(res.body.some((c: { _id: string }) => c._id === categoryId)).toBe(
        true,
      );
    });

    it('should return the category', async () => {
      const res = await request(testApp.http)
        .get(`/api/categories/${categoryId}`)
        .expect(200);

      expect(res.body.ctgr_name).toBe('E2E Category');
    });

    it('should return 404 for an unknown id', async () => {
      await request(testApp.http)
        .get(`/api/categories/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('update a category', () => {
    it('should return 403 for a teacher', async () => {
      await request(testApp.http)
        .patch(`/api/categories/${categoryId}`)
        .set(bearer(teacher))
        .send({ ctgr_name: 'Hijacked' })
        .expect(403);
    });

    it('should update the category name for the super admin', async () => {
      const res = await request(testApp.http)
        .patch(`/api/categories/${categoryId}`)
        .set(bearer(superAdmin))
        .send({ ctgr_name: 'E2E Category Updated' })
        .expect(200);

      expect(res.body.ctgr_name).toBe('E2E Category Updated');
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch(`/api/categories/${categoryId}`)
        .send({ ctgr_name: 'Unauthorized' })
        .expect(401);
    });
  });

  describe('delete a category', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .delete(`/api/categories/${categoryId}`)
        .expect(401);
    });

    it('should return 403 for a teacher', async () => {
      await request(testApp.http)
        .delete(`/api/categories/${categoryId}`)
        .set(bearer(teacher))
        .expect(403);
    });

    it('should return 400 when the category is used by a course', async () => {
      const usedId = await fixtures.createCategory();
      await fixtures.createCourse({
        authorId: teacher.id,
        teacherId: teacher.teacherId,
        categoryId: usedId,
      });

      await request(testApp.http)
        .delete(`/api/categories/${usedId}`)
        .set(bearer(superAdmin))
        .expect(400);
    });

    it('should delete the category for the super admin', async () => {
      await request(testApp.http)
        .delete(`/api/categories/${categoryId}`)
        .set(bearer(superAdmin))
        .expect(204);

      await request(testApp.http)
        .get(`/api/categories/${categoryId}`)
        .expect(404);
    });
  });
});

import { Types } from 'mongoose';
import request from 'supertest';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';

describe('Sections (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let teacher: ITestUser & { teacherId: string };
  let otherTeacher: ITestUser & { teacherId: string };
  let student: ITestUser;
  let superAdmin: ITestUser;
  let courseId: string;
  let sectionId: string;
  const extraSectionIds: string[] = [];

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    teacher = await fixtures.createTeacher('sect_teacher');
    otherTeacher = await fixtures.createTeacher('sect_other');
    student = await fixtures.createUser('sect_student');
    superAdmin = await fixtures.createSuperAdmin('sect_super');
    courseId = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
    });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('add a section', () => {
    it('should create a section for the course author', async () => {
      const res = await request(testApp.http)
        .post('/api/sections')
        .set(bearer(teacher))
        .send({ sect_title: 'E2E Section', course_id: courseId })
        .expect(201);

      sectionId = res.body._id;
      expect(res.body.sect_title).toBe('E2E Section');
      expect(res.body.sect_order).toBe(1);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/sections')
        .send({ sect_title: 'x', course_id: courseId })
        .expect(401);
    });

    it("should return 403 when adding a section to someone else's course", async () => {
      await request(testApp.http)
        .post('/api/sections')
        .set(bearer(otherTeacher))
        .send({ sect_title: 'Hijack', course_id: courseId })
        .expect(403);
      await request(testApp.http)
        .post('/api/sections')
        .set(bearer(student))
        .send({ sect_title: 'Hijack', course_id: courseId })
        .expect(403);
    });

    it('should let the super admin add a section', async () => {
      const res = await request(testApp.http)
        .post('/api/sections')
        .set(bearer(superAdmin))
        .send({ sect_title: 'Admin Section', course_id: courseId })
        .expect(201);

      extraSectionIds.push(res.body._id);
    });

    it('should return 400 when title is missing', async () => {
      await request(testApp.http)
        .post('/api/sections')
        .set(bearer(teacher))
        .send({ course_id: courseId })
        .expect(400);
    });
  });

  describe('read sections', () => {
    it('should return the section', async () => {
      const res = await request(testApp.http)
        .get(`/api/sections/${sectionId}`)
        .expect(200);

      expect(res.body.sect_title).toBe('E2E Section');
    });

    it('should return 404 for an unknown id', async () => {
      await request(testApp.http)
        .get(`/api/sections/${new Types.ObjectId()}`)
        .expect(404);
    });

    it('should return the lessons of the section to the author only', async () => {
      await fixtures.createLesson(sectionId);

      const res = await request(testApp.http)
        .get(`/api/sections/lessons/${sectionId}`)
        .set(bearer(teacher))
        .expect(200);
      expect(res.body).toHaveLength(1);

      await request(testApp.http)
        .get(`/api/sections/lessons/${sectionId}`)
        .set(bearer(student))
        .expect(403);
      await request(testApp.http)
        .get(`/api/sections/lessons/${sectionId}`)
        .expect(401);
    });
  });

  describe('reorder sections', () => {
    let orderedIds: string[];

    it('should append new sections at the end of the course', async () => {
      const res = await request(testApp.http)
        .post('/api/sections')
        .set(bearer(teacher))
        .send({ sect_title: 'Third', course_id: courseId })
        .expect(201);

      extraSectionIds.push(res.body._id);
      expect(res.body.sect_order).toBe(3);
    });

    it('should list the sections of the course by display order', async () => {
      const res = await request(testApp.http)
        .get(`/api/sections/course/${courseId}`)
        .expect(200);

      orderedIds = res.body.map((s: { _id: string }) => s._id);
      expect(orderedIds).toEqual([sectionId, ...extraSectionIds]);
    });

    it('should return 403 when the user is not the course author', async () => {
      await request(testApp.http)
        .patch(`/api/sections/course/${courseId}/reorder`)
        .set(bearer(otherTeacher))
        .send({ ids: [...orderedIds].reverse() })
        .expect(403);
    });

    it('should return 400 when a section of the course is missing', async () => {
      await request(testApp.http)
        .patch(`/api/sections/course/${courseId}/reorder`)
        .set(bearer(teacher))
        .send({ ids: orderedIds.slice(1) })
        .expect(400);
    });

    it('should return 400 when an id is invalid', async () => {
      await request(testApp.http)
        .patch(`/api/sections/course/${courseId}/reorder`)
        .set(bearer(teacher))
        .send({ ids: ['nope'] })
        .expect(400);
    });

    it('should return 404 for an unknown course', async () => {
      await request(testApp.http)
        .patch(`/api/sections/course/${new Types.ObjectId()}/reorder`)
        .set(bearer(teacher))
        .send({ ids: orderedIds })
        .expect(404);
    });

    it('should save the new order of the sections', async () => {
      const reversed = [...orderedIds].reverse();

      const res = await request(testApp.http)
        .patch(`/api/sections/course/${courseId}/reorder`)
        .set(bearer(teacher))
        .send({ ids: reversed })
        .expect(200);

      expect(res.body.map((s: { _id: string }) => s._id)).toEqual(reversed);
    });
  });

  describe('update a section', () => {
    it('should update the section title', async () => {
      const res = await request(testApp.http)
        .patch(`/api/sections/${sectionId}`)
        .set(bearer(teacher))
        .send({ sect_title: 'E2E Section Updated' })
        .expect(200);

      expect(res.body.sect_title).toBe('E2E Section Updated');
    });

    it('should return 403 for another teacher', async () => {
      await request(testApp.http)
        .patch(`/api/sections/${sectionId}`)
        .set(bearer(otherTeacher))
        .send({ sect_title: 'Hijacked' })
        .expect(403);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch(`/api/sections/${sectionId}`)
        .send({ sect_title: 'x' })
        .expect(401);
    });
  });

  describe('delete a section', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .delete(`/api/sections/${sectionId}`)
        .expect(401);
    });

    it('should return 403 for another teacher', async () => {
      await request(testApp.http)
        .delete(`/api/sections/${sectionId}`)
        .set(bearer(otherTeacher))
        .expect(403);
    });

    it('should delete the section and its lessons', async () => {
      await request(testApp.http)
        .delete(`/api/sections/${sectionId}`)
        .set(bearer(teacher))
        .expect(204);

      await request(testApp.http).get(`/api/sections/${sectionId}`).expect(404);
      expect(
        await fixtures
          .model('Lesson')
          .countDocuments({ section: new Types.ObjectId(sectionId) }),
      ).toBe(0);
    });
  });
});

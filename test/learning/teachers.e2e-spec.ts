import { Types } from 'mongoose';
import request from 'supertest';
import { Teacher } from '../../src/modules/learning/schemas/teachers/teacher.schema';
import { RoleEnum } from '../../src/utils/enums/role.enum';
import { UserTypeEnum } from '../../src/utils/enums/user-type.enum';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';

describe('Teachers (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let user: ITestUser;
  let other: ITestUser & { teacherId: string };
  let superAdmin: ITestUser;
  let teacherId: string;

  const profile = {
    tchr_biography: 'E2E teacher biography',
    tchr_title: 'Teachers E2E Trainer',
  };

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    user = await fixtures.createUser('tchr_user');
    other = await fixtures.createTeacher('tchr_other');
    superAdmin = await fixtures.createSuperAdmin('tchr_super');
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('add a teacher profile', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/teachers')
        .send(profile)
        .expect(401);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(testApp.http)
        .post('/api/teachers')
        .set(bearer(user))
        .send({ tchr_title: 'Only a title' })
        .expect(400);
    });

    it('should create the profile for the current user and ignore a forged author', async () => {
      const res = await request(testApp.http)
        .post('/api/teachers')
        .set(bearer(user))
        .send({ ...profile, author: other.id, user_id: other.id })
        .expect(201);

      teacherId = res.body._id;
      expect(res.body.author._id).toBe(user.id);
      expect(res.body.author).not.toHaveProperty('usr_email');
      expect(res.body.tchr_title).toBe(profile.tchr_title);
    });

    it('should promote the user to teacher admin', async () => {
      const dbUser = await fixtures.users.findById(user.id);

      expect(dbUser.usr_type).toBe(UserTypeEnum.TEACHER);
      expect(dbUser.usr_role).toBe(RoleEnum.ADMIN);
    });

    it('should keep the super admin role when a super admin becomes teacher', async () => {
      await fixtures.createTeacherProfile(superAdmin);

      expect((await fixtures.users.findById(superAdmin.id)).usr_role).toBe(
        RoleEnum.SUPERADMIN,
      );
    });

    it('should return 409 for a second profile of the same user', async () => {
      await request(testApp.http)
        .post('/api/teachers')
        .set(bearer(user))
        .send(profile)
        .expect(409);
    });
  });

  describe('read teachers', () => {
    it('should return the list of teachers without private author fields', async () => {
      const res = await request(testApp.http).get('/api/teachers').expect(200);
      const teacher = res.body.find(
        (t: { _id: string; author: { usr_username: string } }) =>
          t._id === teacherId,
      );

      expect(teacher.author.usr_username).toBe(user.username);
      expect(teacher.author).not.toHaveProperty('usr_email');
      expect(teacher.author).not.toHaveProperty('usr_password');
    });

    it('should return the teacher', async () => {
      const res = await request(testApp.http)
        .get(`/api/teachers/${teacherId}`)
        .expect(200);

      expect(res.body.tchr_title).toBe(profile.tchr_title);
    });

    it('should return the teacher by user id', async () => {
      const res = await request(testApp.http)
        .get(`/api/teachers/by/${user.id}`)
        .expect(200);

      expect(res.body._id).toBe(teacherId);
    });

    it('should return 404 for an unknown id', async () => {
      await request(testApp.http)
        .get(`/api/teachers/${new Types.ObjectId()}`)
        .expect(404);
    });
  });

  describe('update a teacher', () => {
    it('should update the teacher profile', async () => {
      const res = await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .set(bearer(user))
        .send({ tchr_title: 'Senior Trainer' })
        .expect(200);

      expect(res.body.tchr_title).toBe('Senior Trainer');
      expect(res.body.tchr_biography).toBe(profile.tchr_biography);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .send({ tchr_title: 'Unauthorized' })
        .expect(401);
    });

    it('should return 403 when another teacher updates the profile', async () => {
      await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .set(bearer(other))
        .send({ tchr_title: 'Hijacked' })
        .expect(403);
    });

    it('should let the super admin update any profile', async () => {
      await request(testApp.http)
        .patch(`/api/teachers/${other.teacherId}`)
        .set(bearer(superAdmin))
        .send({ tchr_title: 'Moderated' })
        .expect(200);
    });
  });

  describe('mentoring settings', () => {
    it('should not list a teacher who is not a mentor', async () => {
      const res = await request(testApp.http)
        .get('/api/teachers/mentors')
        .expect(200);

      expect(res.body.some((t: { _id: string }) => t._id === teacherId)).toBe(
        false,
      );
    });

    it('should return 400 when a mentor has no hourly rate', async () => {
      await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .set(bearer(user))
        .send({ tchr_is_mentor: true })
        .expect(400);
    });

    it('should return 400 when the hourly rate has more than 2 decimals', async () => {
      await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .set(bearer(user))
        .send({ tchr_is_mentor: true, tchr_hourly_rate: 10.555 })
        .expect(400);
    });

    it('should return 400 for an availability outside of the allowed hours', async () => {
      await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .set(bearer(user))
        .send({ tchr_availability: [{ day: 1, times: ['23:00'] }] })
        .expect(400);
    });

    it('should become a mentor with a normalized availability', async () => {
      const res = await request(testApp.http)
        .patch(`/api/teachers/${teacherId}`)
        .set(bearer(user))
        .send({
          tchr_is_mentor: true,
          tchr_hourly_rate: 80,
          tchr_availability: [
            { day: 3, times: ['14:00', '09:00'] },
            { day: 1, times: ['10:00'] },
            { day: 3, times: ['09:00'] },
          ],
        })
        .expect(200);

      expect(res.body.tchr_is_mentor).toBe(true);
      expect(res.body.tchr_availability).toEqual([
        { day: 1, times: ['10:00'] },
        { day: 3, times: ['09:00', '14:00'] },
      ]);

      const mentors = await request(testApp.http)
        .get('/api/teachers/mentors')
        .expect(200);
      expect(
        mentors.body.some((t: { _id: string }) => t._id === teacherId),
      ).toBe(true);
    });
  });

  describe('delete a teacher', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .delete(`/api/teachers/${teacherId}`)
        .expect(401);
    });

    it('should return 403 when another teacher deletes the profile', async () => {
      await request(testApp.http)
        .delete(`/api/teachers/${teacherId}`)
        .set(bearer(other))
        .expect(403);
    });

    it('should return 400 when the profile is linked to courses', async () => {
      await fixtures.createCourse({
        authorId: other.id,
        teacherId: other.teacherId,
      });

      await request(testApp.http)
        .delete(`/api/teachers/${other.teacherId}`)
        .set(bearer(superAdmin))
        .expect(400);
    });

    it('should delete the teacher profile for its owner', async () => {
      await request(testApp.http)
        .delete(`/api/teachers/${teacherId}`)
        .set(bearer(user))
        .expect(204);

      expect(
        await fixtures.model<Teacher>(Teacher.name).findById(teacherId),
      ).toBeNull();
    });
  });
});

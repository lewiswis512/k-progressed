import request from 'supertest';
import { Types } from 'mongoose';
import { RoleEnum } from '../src/utils/enums/role.enum';
import { cloudinaryPhotoMock } from './utils/cloudinary-mock';
import { createApp, ITestApp } from './utils/create-app';
import {
  bearer,
  FAKE_JPEG,
  Fixtures,
  ITestUser,
  sleep,
} from './utils/fixtures';

describe('Users (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let student: ITestUser;
  let other: ITestUser;
  let superAdmin: ITestUser;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    student = await fixtures.createUser('users');
    other = await fixtures.createUser('users_other');
    superAdmin = await fixtures.createSuperAdmin('users_super');
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  describe('GET /api/profile', () => {
    it('should return the authenticated user loaded from the database', async () => {
      const response = await request(testApp.http)
        .get('/api/profile')
        .set(bearer(student))
        .expect(200);

      expect(response.body.id).toBe(student.id);
      expect(response.body.email).toBe(student.email);
      expect(response.body.username).toBe(student.username);
      expect(response.body.role).toBe(RoleEnum.USER);
      expect(response.body).not.toHaveProperty('usr_password');
    });

    it('should read the role from the database, not from the token', async () => {
      await fixtures.setRole(other.id, RoleEnum.ADMIN);

      const response = await request(testApp.http)
        .get('/api/profile')
        .set(bearer(other))
        .expect(200);

      expect(response.body.role).toBe(RoleEnum.ADMIN);
      await fixtures.setRole(other.id, RoleEnum.USER);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http).get('/api/profile').expect(401);
    });

    it('should return 401 with an invalid token', async () => {
      await request(testApp.http)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);
    });

    it('should return 401 with a token signed with another secret', async () => {
      const jwt = require('jsonwebtoken');
      const forged = jwt.sign(
        { id: student.id, role: RoleEnum.SUPERADMIN },
        'another-secret',
      );

      await request(testApp.http)
        .get('/api/profile')
        .set('Authorization', `Bearer ${forged}`)
        .expect(401);
    });

    it('should return 401 when the user of the token no longer exists', async () => {
      const jwt = require('jsonwebtoken');
      const orphan = jwt.sign(
        { id: new Types.ObjectId().toString() },
        process.env.JWT_SECRET,
      );

      await request(testApp.http)
        .get('/api/profile')
        .set('Authorization', `Bearer ${orphan}`)
        .expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http).get('/api/users').expect(401);
    });

    it('should return 403 for a student', async () => {
      await request(testApp.http).get('/api/users').set(bearer(student)).expect(403);
    });

    it('should return a paginated list without secrets for the super admin', async () => {
      const response = await request(testApp.http)
        .get(`/api/users?q=${student.username}&page=1&limit=5`)
        .set(bearer(superAdmin))
        .expect(200);

      expect(response.body).toMatchObject({ page: 1, limit: 5, total: 1 });
      expect(response.body.data[0].usr_email).toBe(student.email);
      expect(response.body.data[0]).not.toHaveProperty('usr_password');
      expect(response.body.data[0]).not.toHaveProperty('stripe_customer_id');
    });

    it('should treat the search as plain text, not as a regex', async () => {
      const response = await request(testApp.http)
        .get(`/api/users?q=${encodeURIComponent('.*')}`)
        .set(bearer(superAdmin))
        .expect(200);

      expect(response.body.total).toBe(0);
    });
  });

  describe('PATCH /api/users/:id/role', () => {
    it('should return 403 for a student', async () => {
      await request(testApp.http)
        .patch(`/api/users/${student.id}/role`)
        .set(bearer(student))
        .send({ usr_role: RoleEnum.SUPERADMIN })
        .expect(403);
    });

    it('should return 400 for an invalid role', async () => {
      await request(testApp.http)
        .patch(`/api/users/${other.id}/role`)
        .set(bearer(superAdmin))
        .send({ usr_role: 42 })
        .expect(400);
    });

    it('should return 400 when the super admin changes their own role', async () => {
      await request(testApp.http)
        .patch(`/api/users/${superAdmin.id}/role`)
        .set(bearer(superAdmin))
        .send({ usr_role: RoleEnum.USER })
        .expect(400);
    });

    it('should return 404 for an unknown user', async () => {
      await request(testApp.http)
        .patch(`/api/users/${new Types.ObjectId()}/role`)
        .set(bearer(superAdmin))
        .send({ usr_role: RoleEnum.ADMIN })
        .expect(404);
    });

    it('should change the role of another user', async () => {
      const response = await request(testApp.http)
        .patch(`/api/users/${other.id}/role`)
        .set(bearer(superAdmin))
        .send({ usr_role: RoleEnum.ADMIN })
        .expect(200);

      expect(response.body.usr_role).toBe(RoleEnum.ADMIN);
      await fixtures.setRole(other.id, RoleEnum.USER);
    });
  });

  describe('PATCH /api/update-profile', () => {
    it('should update the user profile and return a fresh token', async () => {
      const username = `${student.username}_up`;
      const response = await request(testApp.http)
        .patch('/api/update-profile')
        .set(bearer(student))
        .field('usr_username', username)
        .field('usr_firstname', 'John')
        .field('usr_lastname', 'Doe')
        .expect(200);

      expect(response.body.usr_username).toBe(username);
      expect(response.body.usr_firstname).toBe('John');
      expect(response.body.usr_slug).toBe('john-doe');
      expect(typeof response.body.accessToken).toBe('string');
      student.username = username;
    });

    it('should ignore mass-assigned fields', async () => {
      await request(testApp.http)
        .patch('/api/update-profile')
        .set(bearer(student))
        .field('usr_username', student.username)
        .field('usr_role', String(RoleEnum.SUPERADMIN))
        .field('usr_email', 'hijack@test.local')
        .expect(200);

      const user = await fixtures.users.findById(student.id);
      expect(user.usr_role).toBe(RoleEnum.USER);
      expect(user.usr_email).toBe(student.email);
    });

    it('should return 409 when the username belongs to someone else', async () => {
      await request(testApp.http)
        .patch('/api/update-profile')
        .set(bearer(student))
        .field('usr_username', other.username.toUpperCase())
        .expect(409);
    });

    it('should upload a valid photo through the mocked Cloudinary strategy', async () => {
      const response = await request(testApp.http)
        .patch('/api/update-profile')
        .set(bearer(student))
        .field('usr_username', student.username)
        .attach('file', FAKE_JPEG, { filename: 'me.jpg', contentType: 'image/jpeg' })
        .expect(200);

      expect(cloudinaryPhotoMock.upload).toHaveBeenCalled();
      expect(response.body.usr_photo).toMatch(/^https:\/\/res\.cloudinary\.com\/test-cloud\//);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch('/api/update-profile')
        .field('usr_username', 'someone')
        .expect(401);
    });

    it('should return 422 when an invalid file type is uploaded', async () => {
      await request(testApp.http)
        .patch('/api/update-profile')
        .set(bearer(student))
        .field('usr_username', student.username)
        .attach('file', Buffer.from('fake content of a pdf file'), {
          filename: 'test.pdf',
          contentType: 'application/pdf',
        })
        .expect(422);
    });

    it('should return 422 when an image mime type has non image content', async () => {
      await request(testApp.http)
        .patch('/api/update-profile')
        .set(bearer(student))
        .field('usr_username', student.username)
        .attach('file', Buffer.from('<?php echo "not an image"; ?>'), {
          filename: 'shell.jpg',
          contentType: 'image/jpeg',
        })
        .expect(422);
    });
  });

  describe('PATCH /api/change-password', () => {
    const newPassword = 'NewPassword456';
    let newToken: string;

    it('should return 400 without the current password', async () => {
      await request(testApp.http)
        .patch('/api/change-password')
        .set(bearer(student))
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(400);
    });

    it('should return 403 with a wrong current password', async () => {
      await request(testApp.http)
        .patch('/api/change-password')
        .set(bearer(student))
        .send({
          currentPassword: 'WrongPass999',
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(403);
    });

    it('should return 400 when the new password is weak', async () => {
      await request(testApp.http)
        .patch('/api/change-password')
        .set(bearer(student))
        .send({
          currentPassword: student.password,
          password: 'onlyletters',
          confirmPassword: 'onlyletters',
        })
        .expect(400);
    });

    it('should change the password and return a new access token', async () => {
      await sleep(2100);

      const response = await request(testApp.http)
        .patch('/api/change-password')
        .set(bearer(student))
        .send({
          currentPassword: student.password,
          password: newPassword,
          confirmPassword: newPassword,
        })
        .expect(200);

      newToken = response.body.accessToken;
      expect(typeof newToken).toBe('string');
    });

    it('should reject the token issued before the change', async () => {
      await request(testApp.http).get('/api/profile').set(bearer(student)).expect(401);
    });

    it('should accept the new token', async () => {
      await request(testApp.http)
        .get('/api/profile')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
      student.token = newToken;
      student.password = newPassword;
    });

    it('the new password should allow login', async () => {
      const response = await request(testApp.http)
        .post('/api/login')
        .send({ usr_email: student.email, usr_password: newPassword })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .patch('/api/change-password')
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(401);
    });
  });

  describe('GET /api/check-username and /api/check-email', () => {
    it('should return true when username exists', async () => {
      const response = await request(testApp.http)
        .get(`/api/check-username/${other.username}`)
        .expect(200);

      expect(response.text).toBe('true');
    });

    it('should return false when username does not exist', async () => {
      const response = await request(testApp.http)
        .get('/api/check-username/nonexistentuser')
        .expect(200);

      expect(response.text).toBe('false');
    });

    it('should return true when email exists', async () => {
      const response = await request(testApp.http)
        .get(`/api/check-email/${other.email}`)
        .expect(200);

      expect(response.text).toBe('true');
    });

    it('should return false when email does not exist', async () => {
      const response = await request(testApp.http)
        .get('/api/check-email/nobody@test.local')
        .expect(200);

      expect(response.text).toBe('false');
    });
  });

  describe('account export and deletion', () => {
    it('should export only the data of the current user', async () => {
      const response = await request(testApp.http)
        .get('/api/account/export')
        .set(bearer(other))
        .expect(200);

      expect(response.body.profile._id).toBe(other.id);
      expect(response.body.profile).not.toHaveProperty('usr_password');
      expect(response.body.profile).not.toHaveProperty('stripe_customer_id');
      expect(response.body).toHaveProperty('purchases');
      expect(response.body).toHaveProperty('bookings');
    });

    it('should return 401 on export without a token', async () => {
      await request(testApp.http).get('/api/account/export').expect(401);
    });

    it('should return 403 when deleting with a wrong password', async () => {
      await request(testApp.http)
        .delete('/api/account')
        .set(bearer(other))
        .send({ password: 'WrongPass999' })
        .expect(403);
    });

    it('should refuse to delete a super admin account', async () => {
      await request(testApp.http)
        .delete('/api/account')
        .set(bearer(superAdmin))
        .send({ password: superAdmin.password })
        .expect(400);
    });

    it('should refuse to delete the account of a course author', async () => {
      const teacher = await fixtures.createTeacher('users_author');
      await fixtures.createCourse({ authorId: teacher.id, teacherId: teacher.teacherId });

      await request(testApp.http)
        .delete('/api/account')
        .set(bearer(teacher))
        .send({ password: teacher.password })
        .expect(400);
    });

    it('should delete the account and its personal data', async () => {
      await request(testApp.http)
        .delete('/api/account')
        .set(bearer(other))
        .send({ password: other.password })
        .expect(204);

      expect(await fixtures.users.findById(other.id)).toBeNull();
      await request(testApp.http).get('/api/profile').set(bearer(other)).expect(401);
      await request(testApp.http)
        .post('/api/login')
        .send({ usr_email: other.email, usr_password: other.password })
        .expect(401);
    });
  });
});

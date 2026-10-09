import { INestApplication } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import {
  UserReset,
  UserTokenTypeEnum,
} from '../src/modules/users/schemas/user-reset.schema';
import { User } from '../src/modules/users/schemas/user.schema';
import { RoleEnum } from '../src/utils/enums/role.enum';
import { UserTypeEnum } from '../src/utils/enums/user-type.enum';
import { hashToken } from '../src/utils/randoms/generateToken';
import { createApp, ITestApp } from './utils/create-app';
import { DEFAULT_PASSWORD, sleep, tokenFromMail } from './utils/fixtures';
import { stripeMock } from './utils/stripe-mock';

describe('Auth (e2e)', () => {
  let testApp: ITestApp;
  let app: INestApplication;
  let userModel: Model<User>;
  let userResetModel: Model<UserReset>;

  const testUser = {
    usr_username: 'auth_e2e',
    usr_email: 'auth_e2e@test.local',
    usr_password: DEFAULT_PASSWORD,
    acceptTerms: true,
  };

  beforeAll(async () => {
    testApp = await createApp();
    app = testApp.app;
    userModel = testApp.moduleRef.get(getModelToken(User.name));
    userResetModel = testApp.moduleRef.get(getModelToken(UserReset.name));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/signup', () => {
    it('should register an unverified user and only return a message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/signup')
        .send(testUser)
        .expect(201);

      expect(Object.keys(response.body)).toEqual(['message']);

      const user = await userModel
        .findOne({ usr_email: testUser.usr_email })
        .select('+usr_password');
      expect(user.usr_email_verified).toBe(false);
      expect(user.usr_password).not.toBe(testUser.usr_password);
      expect(user.stripe_customer_id).toMatch(/^cus_test_/);
      expect(stripeMock.customers.create).toHaveBeenCalledWith({
        name: testUser.usr_username,
        email: testUser.usr_email,
      });
    });

    it('should email a verification link whose token is stored hashed', async () => {
      const token = tokenFromMail(testApp.mailer, testUser.usr_email, 'verify-email');
      expect(token).toBeDefined();

      const record = await userResetModel.findOne({
        usr_rest_email: testUser.usr_email,
        usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
      });
      expect(record.usr_rest_token).toBe(hashToken(token));
      expect(record.usr_rest_token).not.toBe(token);
    });

    it('should ignore a mass-assigned role, type and verification flag', async () => {
      await request(app.getHttpServer())
        .post('/api/signup')
        .send({
          usr_username: 'auth_e2e_massassign',
          usr_email: 'auth_e2e_massassign@test.local',
          usr_password: DEFAULT_PASSWORD,
          acceptTerms: true,
          usr_role: RoleEnum.SUPERADMIN,
          usr_type: UserTypeEnum.TEACHER,
          usr_email_verified: true,
          stripe_customer_id: 'cus_forged',
        })
        .expect(201);

      const user = await userModel.findOne({
        usr_email: 'auth_e2e_massassign@test.local',
      });
      expect(user.usr_role).toBe(RoleEnum.USER);
      expect(user.usr_type).toBe(UserTypeEnum.STUDENT);
      expect(user.usr_email_verified).toBe(false);
      expect(user.stripe_customer_id).not.toBe('cus_forged');
    });

    it('should return 400 when the email is already taken', async () => {
      await request(app.getHttpServer())
        .post('/api/signup')
        .send({ ...testUser, usr_username: 'auth_e2e_other' })
        .expect(400);
    });

    it('should return 400 when the terms are not accepted', async () => {
      const { acceptTerms, ...body } = testUser;

      await request(app.getHttpServer())
        .post('/api/signup')
        .send({ ...body, usr_username: 'auth_e2e_terms', usr_email: 'terms@test.local' })
        .expect(400);
      await request(app.getHttpServer())
        .post('/api/signup')
        .send({
          ...body,
          acceptTerms: false,
          usr_username: 'auth_e2e_terms',
          usr_email: 'terms@test.local',
        })
        .expect(400);
    });

    it.each([
      ['shorter than 8 characters', 'Pass12'],
      ['without a digit', 'PasswordOnly'],
      ['without a letter', '1234567890'],
    ])('should return 400 when the password is %s', async (_label, password) => {
      await request(app.getHttpServer())
        .post('/api/signup')
        .send({
          ...testUser,
          usr_username: 'auth_e2e_weak',
          usr_email: 'weak@test.local',
          usr_password: password,
        })
        .expect(400);
    });

    it('should return 400 when the username has forbidden characters', async () => {
      await request(app.getHttpServer())
        .post('/api/signup')
        .send({
          ...testUser,
          usr_username: '<script>',
          usr_email: 'script@test.local',
        })
        .expect(400);
    });

    it('should return 400 when email is missing', async () => {
      const { usr_email, ...body } = testUser;

      await request(app.getHttpServer())
        .post('/api/signup')
        .send({ ...body, usr_username: 'auth_e2e_noemail' })
        .expect(400);
    });
  });

  describe('email verification', () => {
    it('should refuse to log in before the email is confirmed', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password })
        .expect(403);
    });

    it('should return 403 with an unknown token', async () => {
      await request(app.getHttpServer())
        .post(`/api/verify-email/${'0'.repeat(64)}`)
        .expect(403);
    });

    it('should return 403 when the hashed token is used as the link token', async () => {
      const record = await userResetModel.findOne({
        usr_rest_email: testUser.usr_email,
        usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
      });

      await request(app.getHttpServer())
        .post(`/api/verify-email/${record.usr_rest_token}`)
        .expect(403);
    });

    it('should send a new link on resend and invalidate the previous one', async () => {
      const previous = tokenFromMail(testApp.mailer, testUser.usr_email, 'verify-email');

      const response = await request(app.getHttpServer())
        .post('/api/resend-verification')
        .send({ email: testUser.usr_email })
        .expect(200);

      const current = tokenFromMail(testApp.mailer, testUser.usr_email, 'verify-email');
      expect(response.body.message).toBeDefined();
      expect(current).not.toBe(previous);

      await request(app.getHttpServer())
        .post(`/api/verify-email/${previous}`)
        .expect(403);
    });

    it('should return the same generic message for an unknown email', async () => {
      const known = await request(app.getHttpServer())
        .post('/api/resend-verification')
        .send({ email: testUser.usr_email })
        .expect(200);
      const unknown = await request(app.getHttpServer())
        .post('/api/resend-verification')
        .send({ email: 'nobody@test.local' })
        .expect(200);

      expect(unknown.body).toEqual(known.body);
    });

    it('should verify the email and return an access token', async () => {
      const token = tokenFromMail(testApp.mailer, testUser.usr_email, 'verify-email');

      const response = await request(app.getHttpServer())
        .post(`/api/verify-email/${token}`)
        .expect(200);

      expect(typeof response.body.accessToken).toBe('string');
      expect(
        (await userModel.findOne({ usr_email: testUser.usr_email })).usr_email_verified,
      ).toBe(true);

      await request(app.getHttpServer())
        .post(`/api/verify-email/${token}`)
        .expect(403);
    });

    it('should return 403 with an expired token', async () => {
      await userResetModel.create({
        _id: new Types.ObjectId(),
        usr_rest_email: 'auth_e2e_massassign@test.local',
        usr_rest_token: hashToken('expired-verification'),
        usr_rest_expired_at: new Date(Date.now() - 60 * 1000),
        usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
      });

      await request(app.getHttpServer())
        .post('/api/verify-email/expired-verification')
        .expect(403);
    });
  });

  describe('POST /api/login', () => {
    it('should return an access token with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password })
        .expect(200);

      expect(typeof response.body.accessToken).toBe('string');
    });

    it('should accept the email with another case', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({
          usr_email: testUser.usr_email.toUpperCase(),
          usr_password: testUser.usr_password,
        })
        .expect(200);
    });

    it('should return 401 with a wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: 'WrongPass123' })
        .expect(401);
    });

    it('should return the same 401 when the user does not exist', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: 'nobody@test.local', usr_password: DEFAULT_PASSWORD })
        .expect(401);

      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_password: DEFAULT_PASSWORD })
        .expect(400);
    });
  });

  describe('POST /api/reset-password', () => {
    let resetMessage: string;

    it('should return a generic message without any token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reset-password')
        .send({ email: testUser.usr_email })
        .expect(200);

      resetMessage = response.body.message;
      expect(Object.keys(response.body)).toEqual(['message']);
      expect(JSON.stringify(response.body)).not.toMatch(/[a-f0-9]{64}/);
    });

    it('should store only the sha256 of the emailed token', async () => {
      const token = tokenFromMail(testApp.mailer, testUser.usr_email, 'forgot-password');
      const record = await userResetModel.findOne({
        usr_rest_email: testUser.usr_email,
        usr_rest_type: UserTokenTypeEnum.RESET_PASSWORD,
      });

      expect(token).toBeDefined();
      expect(record.usr_rest_token).toBe(hashToken(token));
    });

    it('should return the same message when the email does not exist', async () => {
      const callsBefore = testApp.mailer.sendMail.mock.calls.length;

      const response = await request(app.getHttpServer())
        .post('/api/reset-password')
        .send({ email: 'nobody@test.local' })
        .expect(200);

      expect(response.body.message).toBe(resetMessage);
      expect(testApp.mailer.sendMail.mock.calls.length).toBe(callsBefore);
    });

    it('should return 400 when email is missing', async () => {
      await request(app.getHttpServer())
        .post('/api/reset-password')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/forgot-password/:token', () => {
    const newPassword = 'NewPassword456';
    let resetToken: string;
    let tokenBeforeReset: string;

    beforeAll(async () => {
      resetToken = tokenFromMail(testApp.mailer, testUser.usr_email, 'forgot-password');
      const login = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password })
        .expect(200);
      tokenBeforeReset = login.body.accessToken;
      await sleep(1100);
    });

    it('should return 400 when the passwords do not match', async () => {
      await request(app.getHttpServer())
        .post(`/api/forgot-password/${resetToken}`)
        .send({ password: newPassword, confirmPassword: 'Different123' })
        .expect(400);
    });

    it('should return 400 when the new password is weak', async () => {
      await request(app.getHttpServer())
        .post(`/api/forgot-password/${resetToken}`)
        .send({ password: 'weakweak', confirmPassword: 'weakweak' })
        .expect(400);
    });

    it('should return 400 when the stored hash is used as the token', async () => {
      await request(app.getHttpServer())
        .post(`/api/forgot-password/${hashToken(resetToken)}`)
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(400);
    });

    it('should change the password with a valid token', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/forgot-password/${resetToken}`)
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(200);

      expect(response.body).toEqual({ status: 'success' });
    });

    it('should reject an access token issued before the reset', async () => {
      await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${tokenBeforeReset}`)
        .expect(401);
    });

    it('should not accept the same token twice', async () => {
      await request(app.getHttpServer())
        .post(`/api/forgot-password/${resetToken}`)
        .send({ password: 'Another789', confirmPassword: 'Another789' })
        .expect(400);
    });

    it('should log in with the new password only', async () => {
      await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password })
        .expect(401);

      const response = await request(app.getHttpServer())
        .post('/api/login')
        .send({ usr_email: testUser.usr_email, usr_password: newPassword })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');

      await request(app.getHttpServer())
        .get('/api/profile')
        .set('Authorization', `Bearer ${response.body.accessToken}`)
        .expect(200);
    });

    it('should return 400 with an unknown token', async () => {
      await request(app.getHttpServer())
        .post('/api/forgot-password/invalidtoken')
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(400);
    });

    it('should return 400 with an expired token', async () => {
      await userResetModel.create({
        _id: new Types.ObjectId(),
        usr_rest_email: testUser.usr_email,
        usr_rest_token: hashToken('expiredtoken'),
        usr_rest_expired_at: new Date(Date.now() - 2 * 60 * 1000),
        usr_rest_type: UserTokenTypeEnum.RESET_PASSWORD,
      });

      await request(app.getHttpServer())
        .post('/api/forgot-password/expiredtoken')
        .send({ password: newPassword, confirmPassword: newPassword })
        .expect(400);
    });
  });

  describe('rate limiting', () => {
    let throttledApp: ITestApp;

    beforeAll(async () => {
      throttledApp = await createApp({ throttle: true });
    });

    afterAll(async () => {
      await throttledApp.app.close();
    });

    it('should return 429 after 5 reset requests in a minute', async () => {
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await request(throttledApp.http)
          .post('/api/reset-password')
          .send({ email: 'throttle@test.local' })
          .expect(200);
      }

      await request(throttledApp.http)
        .post('/api/reset-password')
        .send({ email: 'throttle@test.local' })
        .expect(429);
    });
  });
});

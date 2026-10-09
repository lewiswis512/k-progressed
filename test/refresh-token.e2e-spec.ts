import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import request from 'supertest';
import { RefreshToken } from '../src/modules/auth/schemas/refresh-token.schema';
import { hashToken } from '../src/utils/randoms/generateToken';
import { createApp, ITestApp } from './utils/create-app';
import { Fixtures, ITestUser, tokenFromMail } from './utils/fixtures';

describe('Refresh token (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let refreshTokenModel: Model<RefreshToken>;

  const login = async (user: Pick<ITestUser, 'email' | 'password'>) => {
    const res = await request(testApp.http)
      .post('/api/login')
      .send({ usr_email: user.email, usr_password: user.password })
      .expect(200);

    return res.body as { accessToken: string; refreshToken: string };
  };

  const refresh = (refreshToken: string) =>
    request(testApp.http).post('/api/refresh-token').send({ refreshToken });

  const profile = (accessToken: string) =>
    request(testApp.http)
      .get('/api/profile')
      .set('Authorization', `Bearer ${accessToken}`);

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    refreshTokenModel = testApp.moduleRef.get(getModelToken(RefreshToken.name));
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it('should return an access token and a refresh token at login', async () => {
    const user = await fixtures.createUser('rt_login');
    const session = await login(user);

    expect(typeof session.accessToken).toBe('string');
    expect(session.refreshToken).toMatch(/^[a-f0-9]{96}$/);

    const stored = await refreshTokenModel.findOne({
      rfsh_token: hashToken(session.refreshToken),
    });

    expect(stored).not.toBeNull();
    expect(
      await refreshTokenModel.countDocuments({
        rfsh_token: session.refreshToken,
      }),
    ).toBe(0);
  });

  it('should return a new pair and accept the new access token', async () => {
    const user = await fixtures.createUser('rt_rotate');
    const session = await login(user);

    const res = await refresh(session.refreshToken).expect(200);

    expect(res.body.refreshToken).not.toBe(session.refreshToken);
    await profile(res.body.accessToken).expect(200);
    await refresh(res.body.refreshToken).expect(200);
  });

  it('should revoke the whole session when a used refresh token is replayed', async () => {
    const user = await fixtures.createUser('rt_reuse');
    const session = await login(user);
    const rotated = (await refresh(session.refreshToken).expect(200)).body;

    await refresh(session.refreshToken).expect(401);
    await refresh(rotated.refreshToken).expect(401);
  });

  it('should revoke every session of the user when a refresh token is replayed', async () => {
    const user = await fixtures.createUser('rt_devices');
    const laptop = await login(user);
    const phone = await login(user);

    await refresh(laptop.refreshToken).expect(200);
    await refresh(laptop.refreshToken).expect(401);

    await refresh(phone.refreshToken).expect(401);
  });

  it('should refuse a refresh token after logout', async () => {
    const user = await fixtures.createUser('rt_logout');
    const session = await login(user);

    await request(testApp.http)
      .post('/api/logout')
      .send({ refreshToken: session.refreshToken })
      .expect(204);

    await refresh(session.refreshToken).expect(401);
  });

  it('should answer 204 on logout with an unknown refresh token', async () => {
    await request(testApp.http)
      .post('/api/logout')
      .send({ refreshToken: 'unknown' })
      .expect(204);
  });

  it('should refuse an expired refresh token', async () => {
    const user = await fixtures.createUser('rt_expired');
    const session = await login(user);

    await refreshTokenModel.updateOne(
      { rfsh_token: hashToken(session.refreshToken) },
      { rfsh_expired_at: new Date(Date.now() - 1000) },
    );

    await refresh(session.refreshToken).expect(401);
  });

  it('should refuse an unknown refresh token and a missing body', async () => {
    await refresh('not-a-real-token').expect(401);
    await request(testApp.http).post('/api/refresh-token').send({}).expect(400);
  });

  it('should revoke the other sessions when the password is changed', async () => {
    const user = await fixtures.createUser('rt_password');
    const other = await login(user);
    const current = await login(user);
    const newPassword = 'NewPassword456';

    const res = await request(testApp.http)
      .patch('/api/change-password')
      .set('Authorization', `Bearer ${current.accessToken}`)
      .send({
        currentPassword: user.password,
        password: newPassword,
        confirmPassword: newPassword,
      })
      .expect(200);

    expect(typeof res.body.refreshToken).toBe('string');
    await refresh(other.refreshToken).expect(401);
    await refresh(current.refreshToken).expect(401);
    await refresh(res.body.refreshToken).expect(200);
  });

  it('should refuse the refresh token of a deleted user', async () => {
    const user = await fixtures.createUser('rt_deleted');
    const session = await login(user);

    await fixtures.users.deleteOne({ _id: new Types.ObjectId(user.id) });

    await refresh(session.refreshToken).expect(401);
  });

  it('should refuse a refresh token issued before a password reset', async () => {
    const user = await fixtures.createUser('rt_reset');
    const session = await login(user);
    const newPassword = 'NewPassword456';

    await request(testApp.http)
      .post('/api/reset-password')
      .send({ email: user.email })
      .expect(200);
    await request(testApp.http)
      .post(
        `/api/forgot-password/${tokenFromMail(testApp.mailer, user.email, 'forgot-password')}`,
      )
      .send({ password: newPassword, confirmPassword: newPassword })
      .expect(200);

    await refresh(session.refreshToken).expect(401);
  });
});

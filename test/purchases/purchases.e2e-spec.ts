import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../../src/modules/users/schemas/user.schema';
import { Purchase } from '../../src/modules/purchases/schemas/purchase.schema';
import { PaymentMethodEnum } from '../../src/utils/enums/payment-method.enum';
import { createApp } from '../learning/setup';

describe('Purchases (e2e)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userModel: Model<User>;
  let purchaseModel: Model<Purchase>;
  let accessToken: string;
  let purchaseId: string;
  let userId: string;

  const testUser = {
    usr_username: 'purchases_e2e',
    usr_email: 'purchases_e2e@test.com',
    usr_password: 'Password123',
  };

  const buildPayload = (uid: string) => ({
    payment_method: PaymentMethodEnum.STRIPE,
    user: {
      id: uid,
      name: 'Test User',
      email: testUser.usr_email,
      address: { city: 'Paris', line1: '1 Rue de la Paix', postal_code: '75001' },
    },
    purchaseItems: [
      {
        id: new Types.ObjectId().toString(),
        title: 'E2E Course',
        slug: 'e2e-course',
        image: 'https://res.cloudinary.com/test/image/upload/test.jpg',
        price: 29.99,
        qty: 1,
      },
    ],
  });

  beforeAll(async () => {
    ({ app, moduleRef } = await createApp());
    userModel = moduleRef.get(getModelToken(User.name));
    purchaseModel = moduleRef.get(getModelToken(Purchase.name));

    await userModel.deleteMany({ usr_email: testUser.usr_email });
    const signupRes = await request(app.getHttpServer()).post('/api/signup').send(testUser);
    userId = signupRes.body._id;

    const loginRes = await request(app.getHttpServer())
      .post('/api/login')
      .send({ usr_email: testUser.usr_email, usr_password: testUser.usr_password });
    accessToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    if (purchaseId) await purchaseModel.findByIdAndDelete(purchaseId);
    await userModel.deleteMany({ usr_email: testUser.usr_email });
    await app.close();
  });

  describe('record a new purchase', () => {
    it('should create a purchase and return a reference', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/purchases')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(buildPayload(userId))
        .expect(201);

      purchaseId = res.body._id;
      expect(res.body).toHaveProperty('purch_reference');
      expect(res.body.purch_is_paid).toBe(false);
      expect(res.body.purchaseItems).toHaveLength(1);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .post('/api/purchases')
        .send(buildPayload(userId))
        .expect(401);
    });
  });

  describe('list purchases', () => {
    it('should return the list of purchases', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/purchases')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/purchases').expect(401);
    });
  });

  describe('get a purchase by id', () => {
    it('should return the purchase', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/purchases/${purchaseId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body._id).toBe(purchaseId);
      expect(res.body).toHaveProperty('purch_reference');
      expect(res.body.purchaseItems).toHaveLength(1);
    });

    it('should return 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .get(`/api/purchases/${new Types.ObjectId()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .get(`/api/purchases/${purchaseId}`)
        .expect(401);
    });
  });

  describe('validate a purchase as paid', () => {
    it('should mark the purchase as paid', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/purchases/${purchaseId}/validate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.purch_is_paid).toBe(true);
    });

    it('should return 401 without a token', async () => {
      await request(app.getHttpServer())
        .patch(`/api/purchases/${purchaseId}/validate`)
        .expect(401);
    });
  });
});

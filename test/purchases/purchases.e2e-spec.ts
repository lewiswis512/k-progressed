import { Model, Types } from 'mongoose';
import request from 'supertest';
import {
  Purchase,
  PurchaseStatusEnum,
} from '../../src/modules/purchases/schemas/purchase.schema';
import { CourseStatusEnum } from '../../src/utils/enums/course-status.enum';
import { createApp, ITestApp } from '../utils/create-app';
import { bearer, Fixtures, ITestUser } from '../utils/fixtures';
import { stripeMock } from '../utils/stripe-mock';

describe('Purchases (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let purchaseModel: Model<Purchase>;
  let teacher: ITestUser & { teacherId: string };
  let student: ITestUser;
  let otherStudent: ITestUser;
  let superAdmin: ITestUser;
  let courseA: string;
  let courseB: string;
  let freeCourse: string;
  let cheapCourse: string;
  let pendingCourse: string;
  let purchaseId: string;

  const billing = {
    name: 'Test Buyer',
    address: { line1: '1 rue du Test', city: 'Paris', postal_code: '75001' },
  };

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    purchaseModel = fixtures.model<Purchase>(Purchase.name);

    teacher = await fixtures.createTeacher('purch_teacher');
    student = await fixtures.createUser('purch_student');
    otherStudent = await fixtures.createUser('purch_other');
    superAdmin = await fixtures.createSuperAdmin('purch_super');

    const course = (price: number, status = CourseStatusEnum.VALIDATED) =>
      fixtures.createCourse({
        authorId: teacher.id,
        teacherId: teacher.teacherId,
        price,
        status,
      });

    courseA = await course(29.99);
    courseB = await course(10.1);
    freeCourse = await course(0);
    cheapCourse = await course(0.3);
    pendingCourse = await course(15, CourseStatusEnum.PENDING);
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  const createPurchase = (user: ITestUser, body: Record<string, unknown>) =>
    request(testApp.http).post('/api/purchases').set(bearer(user)).send(body);

  describe('POST /api/purchases', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post('/api/purchases')
        .send({ courseIds: [courseA], billing })
        .expect(401);
    });

    it('should compute the prices on the server and ignore client prices', async () => {
      const response = await createPurchase(student, {
        courseIds: [courseA, courseB, courseA],
        billing,
        purch_total: 0.01,
        purch_is_paid: true,
        purchaseItems: [{ id: courseA, price: 0.01 }],
        user: { id: otherStudent.id, email: otherStudent.email },
      }).expect(201);

      purchaseId = response.body._id;
      expect(response.body.purch_reference).toMatch(/^KP-\d{8}-[0-9A-F]{6}$/);
      expect(response.body.purch_total).toBe(40.09);
      expect(response.body.purch_is_paid).toBe(false);
      expect(response.body.purch_status).toBe(PurchaseStatusEnum.PENDING);
      expect(response.body.user.id).toBe(student.id);
      expect(response.body.user.email).toBe(student.email);
      expect(response.body.purchaseItems).toHaveLength(2);
      expect(
        response.body.purchaseItems
          .map((item: { price: number }) => item.price)
          .sort(),
      ).toEqual([10.1, 29.99]);
    });

    it('should return 400 for an empty cart', async () => {
      await createPurchase(student, { courseIds: [], billing }).expect(400);
    });

    it('should return 400 with incomplete billing details', async () => {
      await createPurchase(student, {
        courseIds: [courseA],
        billing: { name: 'Test', address: { city: 'Paris' } },
      }).expect(400);
      await createPurchase(student, {
        courseIds: [courseA],
        billing: { ...billing, name: '' },
      }).expect(400);
    });

    it('should return 400 when billing is missing', async () => {
      await createPurchase(student, { courseIds: [courseA] }).expect(400);
    });

    it('should return 400 when the billing address is missing', async () => {
      await createPurchase(student, {
        courseIds: [courseA],
        billing: { name: 'Test' },
      }).expect(400);
    });

    it('should return 400 for an invalid course id', async () => {
      await createPurchase(student, {
        courseIds: ['not-an-id'],
        billing,
      }).expect(400);
    });

    it('should return 400 for an unknown or unpublished course', async () => {
      await createPurchase(student, {
        courseIds: [new Types.ObjectId().toString()],
        billing,
      }).expect(400);
      await createPurchase(student, {
        courseIds: [pendingCourse],
        billing,
      }).expect(400);
    });

    it('should return 400 when the teacher buys their own course', async () => {
      await createPurchase(teacher, { courseIds: [courseA], billing }).expect(
        400,
      );
    });

    it('should mark a free order as paid and send a receipt', async () => {
      const response = await createPurchase(otherStudent, {
        courseIds: [freeCourse],
        billing,
      }).expect(201);

      expect(response.body.purch_total).toBe(0);
      expect(response.body.purch_is_paid).toBe(true);
      expect(response.body.purch_status).toBe(PurchaseStatusEnum.PAID);
      expect(
        testApp.mailer.sendMail.mock.calls.some(
          ([mail]) => mail.to === otherStudent.email && /KP-/.test(mail.html),
        ),
      ).toBe(true);
    });

    it('should return 400 when the course is already owned', async () => {
      await createPurchase(otherStudent, {
        courseIds: [freeCourse],
        billing,
      }).expect(400);
    });
  });

  describe('GET /api/purchases', () => {
    it('should list only the purchases of the current user', async () => {
      const response = await request(testApp.http)
        .get('/api/purchases')
        .set(bearer(student))
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every(
          (p: { user: { id: string } }) => p.user.id === student.id,
        ),
      ).toBe(true);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http).get('/api/purchases').expect(401);
    });
  });

  describe('GET /api/purchases/admin', () => {
    it('should return 403 for a student', async () => {
      await request(testApp.http)
        .get('/api/purchases/admin')
        .set(bearer(student))
        .expect(403);
    });

    it('should return every purchase for the super admin', async () => {
      const response = await request(testApp.http)
        .get('/api/purchases/admin?limit=50')
        .set(bearer(superAdmin))
        .expect(200);

      const owners = new Set(
        response.body.data.map((p: { user: { id: string } }) => p.user.id),
      );
      expect(owners.has(student.id)).toBe(true);
      expect(owners.has(otherStudent.id)).toBe(true);
    });
  });

  describe('GET /api/purchases/:id', () => {
    it('should return the purchase to its owner', async () => {
      const response = await request(testApp.http)
        .get(`/api/purchases/${purchaseId}`)
        .set(bearer(student))
        .expect(200);

      expect(response.body._id).toBe(purchaseId);
    });

    it("should return 403 when a student reads someone else's purchase", async () => {
      await request(testApp.http)
        .get(`/api/purchases/${purchaseId}`)
        .set(bearer(otherStudent))
        .expect(403);
    });

    it('should return the purchase to the super admin', async () => {
      await request(testApp.http)
        .get(`/api/purchases/${purchaseId}`)
        .set(bearer(superAdmin))
        .expect(200);
    });

    it('should return 404 for an unknown id', async () => {
      await request(testApp.http)
        .get(`/api/purchases/${new Types.ObjectId()}`)
        .set(bearer(student))
        .expect(404);
    });

    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .get(`/api/purchases/${purchaseId}`)
        .expect(401);
    });
  });

  describe('removed endpoints', () => {
    it('should not expose PATCH /api/purchases/:id/validate anymore', async () => {
      await request(testApp.http)
        .patch(`/api/purchases/${purchaseId}/validate`)
        .set(bearer(student))
        .expect(404);

      expect((await purchaseModel.findById(purchaseId)).purch_is_paid).toBe(
        false,
      );
    });

    it('should not expose POST /api/payment-intent/create anymore', async () => {
      await request(testApp.http)
        .post('/api/payment-intent/create')
        .set(bearer(student))
        .send({ amount: 1 })
        .expect(404);
    });
  });

  describe('POST /api/payment-intent/purchase/:id', () => {
    it('should return 401 without a token', async () => {
      await request(testApp.http)
        .post(`/api/payment-intent/purchase/${purchaseId}`)
        .expect(401);
    });

    it("should return 403 for someone else's purchase", async () => {
      await request(testApp.http)
        .post(`/api/payment-intent/purchase/${purchaseId}`)
        .set(bearer(otherStudent))
        .expect(403);
    });

    it('should create a Stripe intent with the server side amount in cents', async () => {
      stripeMock.paymentIntents.create.mockClear();

      const response = await request(testApp.http)
        .post(`/api/payment-intent/purchase/${purchaseId}`)
        .set(bearer(student))
        .expect(201);

      expect(response.body.amount).toBe(40.09);
      expect(response.body.client_secret).toMatch(/^pi_test_.+_secret_test$/);
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledTimes(1);
      expect(stripeMock.paymentIntents.create.mock.calls[0][0]).toMatchObject({
        amount: 4009,
        currency: 'eur',
        metadata: { purchaseId, userId: student.id },
      });

      const purchase = await purchaseModel.findById(purchaseId);
      expect(purchase.purch_payment_intent_id).toBe(
        response.body.client_secret.split('_secret')[0],
      );
    });

    it('should reuse a still open intent instead of creating a new one', async () => {
      const purchase = await purchaseModel.findById(purchaseId);
      stripeMock.paymentIntents.create.mockClear();
      stripeMock.paymentIntents.retrieve.mockResolvedValueOnce({
        id: purchase.purch_payment_intent_id,
        object: 'payment_intent',
        amount: 4009,
        status: 'requires_payment_method',
        client_secret: `${purchase.purch_payment_intent_id}_secret_test`,
      });

      const response = await request(testApp.http)
        .post(`/api/payment-intent/purchase/${purchaseId}`)
        .set(bearer(student))
        .expect(201);

      expect(stripeMock.paymentIntents.create).not.toHaveBeenCalled();
      expect(response.body.client_secret).toBe(
        `${purchase.purch_payment_intent_id}_secret_test`,
      );
    });

    it('should return 400 when the total is below the Stripe minimum', async () => {
      const response = await createPurchase(student, {
        courseIds: [cheapCourse],
        billing,
      }).expect(201);

      await request(testApp.http)
        .post(`/api/payment-intent/purchase/${response.body._id}`)
        .set(bearer(student))
        .expect(400);
    });

    it('should return 400 for an already paid purchase', async () => {
      const paidId = await fixtures.createPurchase(student, [courseB]);

      await request(testApp.http)
        .post(`/api/payment-intent/purchase/${paidId}`)
        .set(bearer(student))
        .expect(400);
    });
  });

  describe('POST /api/payment-intent/refund/purchase/:id', () => {
    it('should return 403 for a student', async () => {
      await request(testApp.http)
        .post(`/api/payment-intent/refund/purchase/${purchaseId}`)
        .set(bearer(student))
        .expect(403);
    });

    it('should refund a paid purchase through Stripe for the super admin', async () => {
      const paidId = await fixtures.createPurchase(otherStudent, [courseA]);
      await purchaseModel.updateOne(
        { _id: paidId },
        { purch_payment_intent_id: 'pi_test_refund' },
      );
      stripeMock.refunds.create.mockClear();

      await request(testApp.http)
        .post(`/api/payment-intent/refund/purchase/${paidId}`)
        .set(bearer(superAdmin))
        .expect(201);

      expect(stripeMock.refunds.create).toHaveBeenCalledWith({
        payment_intent: 'pi_test_refund',
      });
      const refunded = await purchaseModel.findById(paidId);
      expect(refunded.purch_status).toBe(PurchaseStatusEnum.REFUNDED);
      expect(refunded.purch_is_paid).toBe(false);
    });
  });
});

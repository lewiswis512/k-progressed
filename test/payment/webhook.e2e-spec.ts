import { Model } from 'mongoose';
import request from 'supertest';
import { StripeEvent } from '../../src/modules/payment/schemas/stripe-event.schema';
import {
  Purchase,
  PurchaseStatusEnum,
} from '../../src/modules/purchases/schemas/purchase.schema';
import { createApp, ITestApp } from '../utils/create-app';
import { Fixtures, ITestUser } from '../utils/fixtures';
import { signedWebhook, stripeMock } from '../utils/stripe-mock';

describe('Stripe webhook (e2e)', () => {
  let testApp: ITestApp;
  let fixtures: Fixtures;
  let purchaseModel: Model<Purchase>;
  let stripeEventModel: Model<StripeEvent>;
  let student: ITestUser;
  let courseId: string;

  beforeAll(async () => {
    testApp = await createApp();
    fixtures = new Fixtures(testApp);
    purchaseModel = fixtures.model<Purchase>(Purchase.name);
    stripeEventModel = fixtures.model<StripeEvent>(StripeEvent.name);

    const teacher = await fixtures.createTeacher('webhook_teacher');
    student = await fixtures.createUser('webhook_student');
    courseId = await fixtures.createCourse({
      authorId: teacher.id,
      teacherId: teacher.teacherId,
      price: 29.99,
    });
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  let eventSequence = 0;
  const succeededEvent = (
    purchaseId: string,
    amountReceived: number,
    currency = 'eur',
  ) => {
    eventSequence += 1;

    return {
      id: `evt_test_${eventSequence}_${Date.now()}`,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_test_webhook_${eventSequence}`,
          object: 'payment_intent',
          amount: amountReceived,
          amount_received: amountReceived,
          currency,
          latest_charge: null as string | null,
          metadata: { purchaseId },
        },
      },
    };
  };

  const send = (payload: string, signature?: string) => {
    const req = request(testApp.http)
      .post('/api/webhook')
      .set('Content-Type', 'application/json');

    return (signature ? req.set('Stripe-Signature', signature) : req).send(
      payload,
    );
  };

  const receiptsFor = (email: string) =>
    testApp.mailer.sendMail.mock.calls.filter(([mail]) => mail.to === email)
      .length;

  it('should return 400 without a signature', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const { payload } = signedWebhook(succeededEvent(purchaseId, 2999));

    await send(payload).expect(400);
    expect((await purchaseModel.findById(purchaseId)).purch_is_paid).toBe(
      false,
    );
  });

  it('should return 400 with a forged signature', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const { payload } = signedWebhook(succeededEvent(purchaseId, 2999));
    const forged = stripeMock.webhooks.generateTestHeaderString({
      payload,
      secret: 'whsec_attacker_secret',
    });

    await send(payload, forged).expect(400);
    expect((await purchaseModel.findById(purchaseId)).purch_is_paid).toBe(
      false,
    );
  });

  it('should return 400 when the signed payload has been tampered with', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const { signature } = signedWebhook(succeededEvent(purchaseId, 1));
    const tampered = JSON.stringify(succeededEvent(purchaseId, 2999));

    await send(tampered, signature).expect(400);
    expect((await purchaseModel.findById(purchaseId)).purch_is_paid).toBe(
      false,
    );
  });

  it('should mark the purchase as paid when the amount matches', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const event = succeededEvent(purchaseId, 2999);
    const { payload, signature } = signedWebhook(event);
    const receiptsBefore = receiptsFor(student.email);

    const response = await send(payload, signature).expect(200);

    expect(response.body).toEqual({ received: true });
    const purchase = await purchaseModel.findById(purchaseId);
    expect(purchase.purch_is_paid).toBe(true);
    expect(purchase.purch_status).toBe(PurchaseStatusEnum.PAID);
    expect(purchase.purch_payment_intent_id).toBe(event.data.object.id);
    expect(receiptsFor(student.email)).toBe(receiptsBefore + 1);
  });

  it('should be idempotent when the same event is replayed', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const event = succeededEvent(purchaseId, 2999);
    const { payload, signature } = signedWebhook(event);

    await send(payload, signature).expect(200);
    const paidAt = (await purchaseModel.findById(purchaseId)).purch_paid_at;
    const receiptsAfterFirst = receiptsFor(student.email);

    await send(payload, signature).expect(200);
    await send(payload, signature).expect(200);

    expect(receiptsFor(student.email)).toBe(receiptsAfterFirst);
    expect((await purchaseModel.findById(purchaseId)).purch_paid_at).toEqual(
      paidAt,
    );
    expect(await stripeEventModel.countDocuments({ event_id: event.id })).toBe(
      1,
    );
  });

  it('should not send a second receipt for another event on an already paid purchase', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const first = signedWebhook(succeededEvent(purchaseId, 2999));
    const second = signedWebhook(succeededEvent(purchaseId, 2999));

    await send(first.payload, first.signature).expect(200);
    const receipts = receiptsFor(student.email);
    await send(second.payload, second.signature).expect(200);

    expect(receiptsFor(student.email)).toBe(receipts);
  });

  it('should not mark the purchase as paid when the amount does not match', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const { payload, signature } = signedWebhook(
      succeededEvent(purchaseId, 100),
    );

    await send(payload, signature).expect(200);

    const purchase = await purchaseModel.findById(purchaseId);
    expect(purchase.purch_is_paid).toBe(false);
    expect(purchase.purch_status).toBe(PurchaseStatusEnum.PENDING);
  });

  it('should not mark the purchase as paid when the currency does not match', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const { payload, signature } = signedWebhook(
      succeededEvent(purchaseId, 2999, 'usd'),
    );

    await send(payload, signature).expect(200);

    expect((await purchaseModel.findById(purchaseId)).purch_is_paid).toBe(
      false,
    );
  });

  it('should mark the purchase as refunded on charge.refunded', async () => {
    const purchaseId = await fixtures.createPurchase(student, [courseId], {
      paid: false,
    });
    const paid = succeededEvent(purchaseId, 2999);
    const paidSigned = signedWebhook(paid);
    await send(paidSigned.payload, paidSigned.signature).expect(200);

    const refund = signedWebhook({
      id: `evt_test_refund_${Date.now()}`,
      object: 'event',
      type: 'charge.refunded',
      data: {
        object: {
          id: 'ch_test_refund',
          object: 'charge',
          refunded: true,
          payment_intent: paid.data.object.id,
        },
      },
    });

    await send(refund.payload, refund.signature).expect(200);

    const purchase = await purchaseModel.findById(purchaseId);
    expect(purchase.purch_status).toBe(PurchaseStatusEnum.REFUNDED);
    expect(purchase.purch_is_paid).toBe(false);
  });

  it('should acknowledge unrelated event types', async () => {
    const { payload, signature } = signedWebhook({
      id: `evt_test_other_${Date.now()}`,
      object: 'event',
      type: 'customer.created',
      data: { object: { id: 'cus_test' } },
    });

    await send(payload, signature).expect(200);
  });
});

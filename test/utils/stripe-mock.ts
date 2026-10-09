import Stripe from 'stripe';

const signingStripe = new Stripe('sk_test_fake_key_for_tests');

let sequence = 0;
const nextId = (prefix: string) => {
  sequence += 1;

  return `${prefix}_test_${Date.now().toString(36)}${sequence}`;
};

export const stripeMock = {
  webhooks: signingStripe.webhooks,
  customers: {
    create: jest.fn(async () => ({ id: nextId('cus') })),
  },
  paymentIntents: {
    create: jest.fn(async (params: { amount: number; currency: string }) => {
      const id = nextId('pi');

      return {
        id,
        object: 'payment_intent',
        amount: params.amount,
        currency: params.currency,
        status: 'requires_payment_method',
        client_secret: `${id}_secret_test`,
      };
    }),
    retrieve: jest.fn(async (id: string) => ({
      id,
      object: 'payment_intent',
      amount: 0,
      status: 'canceled',
      client_secret: `${id}_secret_test`,
    })),
    cancel: jest.fn(async (id: string) => ({ id, status: 'canceled' })),
  },
  refunds: {
    create: jest.fn(async (params: { payment_intent: string }) => ({
      id: nextId('re'),
      payment_intent: params.payment_intent,
      status: 'succeeded',
    })),
  },
  charges: {
    retrieve: jest.fn(async (id: string) => ({
      id,
      amount: 0,
      currency: 'eur',
      status: 'succeeded',
      payment_method_details: { type: 'card' },
      billing_details: {},
      customer: null as string | null,
    })),
  },
};

export const signedWebhook = (event: Record<string, unknown>) => {
  const payload = JSON.stringify(event);
  const signature = signingStripe.webhooks.generateTestHeaderString({
    payload,
    secret: process.env.WEBHOOK_STRIPE_SECRET,
  });

  return { payload, signature };
};

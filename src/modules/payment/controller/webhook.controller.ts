import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import Stripe from 'stripe';
import { StripeService } from '../service/stripe.service';

@Controller('/webhook')
export class WebhookController extends StripeService {
  @Post()
  @ApiExcludeEndpoint()
  post(
    @Headers('stripe-signature') stripeSignature: string,
    @Req() request: Request,
  ) {
    let event: Stripe.Event;
    const webhookStripeSecret = process.env.WEBHOOK_STRIPE_SECRET;

    if (webhookStripeSecret) {
      try {
        event = this.stripe.webhooks.constructEvent(
          request.body,
          stripeSignature,
          webhookStripeSecret,
        );
      } catch (error: any) {
        console.error(
          `Webhook signature verification failed. ${error.message}`,
        );
      }
    } else {
      throw new Error('Failed to fetch the webhook secret');
    }

    switch (event.type) {
      case 'payment_intent.created':
        console.info('Payment intent created');
        break;
      case 'payment_intent.succeeded':
        console.info('Payment intent succeeded');
        break;
      case 'charge.succeeded':
        console.info('Charge succeeded:', event.data.object);
        break;
      case 'charge.updated':
        console.info('Charge updated');
        break;
      case 'charge.failed':
        throw new Error(`Charge failed: ${event.data.object}`);
      default:
        throw new Error(`Unhandled event type ${event.type}`);
    }

    console.log(event);
  }
}

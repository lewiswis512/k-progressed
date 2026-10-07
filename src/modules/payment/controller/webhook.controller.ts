import { Controller, Headers, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from '../service/payment.service';

@Controller('/webhook')
export class WebhookController {
  public constructor(private paymentService: PaymentService) {}

  @Post()
  @ApiExcludeEndpoint()
  async post(
    @Headers('stripe-signature') stripeSignature: string,
    @Req() request: Request,
  ) {
    const webhookSecret = process.env.WEBHOOK_STRIPE_SECRET;

    await this.paymentService.webhook(
      request.body,
      stripeSignature,
      webhookSecret,
    );
  }
}

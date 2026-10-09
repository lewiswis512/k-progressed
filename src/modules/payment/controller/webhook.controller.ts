import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { PaymentService } from '../service/payment.service';

@Controller('/webhook')
@SkipThrottle()
export class WebhookController {
  public constructor(private paymentService: PaymentService) {}

  @Post()
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async post(
    @Headers('stripe-signature') stripeSignature: string,
    @Req() request: Request,
  ) {
    return this.paymentService.webhook(request.body, stripeSignature);
  }
}

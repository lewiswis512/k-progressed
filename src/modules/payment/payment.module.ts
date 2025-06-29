import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  StripePaymentIntent,
  StripePaymentIntentSchema,
} from '../../modules/payment/schemas/stripe-payment-intent.schema';
import { StripeService } from '../../modules/payment/service/stripe.service';
import { ConfigController } from './controller/config.controller';
import { PaymentIntentController } from './controller/payment-intent.controller';
import { StripePaymentIntentRepository } from './repository/stripePaymentIntent.repository';
import { PaymentService } from './service/payment.service';
import { WebhookController } from './controller/webhook.controller';
import { PurchasesService } from '../purchases/purchases.service';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: StripePaymentIntent.name, schema: StripePaymentIntentSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  controllers: [PaymentIntentController, ConfigController, WebhookController],
  providers: [
    StripeService,
    StripePaymentIntentRepository,
    PaymentService,
    PurchasesService,
    PurchaseRepository,
  ],
})
export class PaymentModule {}

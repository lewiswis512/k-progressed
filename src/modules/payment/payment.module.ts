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
import { AuthModule } from '../auth/auth.module';
import { MentoringModule } from '../learning/modules/mentoring.module';
import { TeachersModule } from '../learning/modules/teachers.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { StripeEventRepository } from './repository/stripe-event.repository';
import { StripeEvent, StripeEventSchema } from './schemas/stripe-event.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserRepository } from '../users/repository/user.repository';

@Module({
  imports: [
    AuthModule,
    MentoringModule,
    TeachersModule,
    PurchasesModule,
    MongooseModule.forFeature([
      { name: StripePaymentIntent.name, schema: StripePaymentIntentSchema },
      { name: StripeEvent.name, schema: StripeEventSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [PaymentIntentController, ConfigController, WebhookController],
  providers: [
    StripeService,
    StripePaymentIntentRepository,
    StripeEventRepository,
    PaymentService,
    UserRepository,
  ],
})
export class PaymentModule {}

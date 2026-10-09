import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';
import Stripe from 'stripe';
import { IRequestUser } from '../../../common/auth/authenticated-request';
import { StripeService } from '../../../modules/payment/service/stripe.service';
import { StripeEventRepository } from '../repository/stripe-event.repository';
import { StripePaymentIntentRepository } from '../repository/stripePaymentIntent.repository';
import { TeacherRepository } from '../../../modules/learning/repositories/teacher.repository';
import { CreateMentoringPaymentIntent } from '../dto/create-mentoring-payment-intent.dto';
import { BookingsService } from '../../../modules/learning/services/bookings.service';
import {
  PurchasesService,
  toCents,
} from '../../../modules/purchases/purchases.service';
import {
  errorMessage,
  errorStack,
  isDuplicateKeyError,
} from '../../../utils/errors';

const REUSABLE_INTENT_STATUSES: Stripe.PaymentIntent.Status[] = [
  'requires_payment_method',
  'requires_confirmation',
  'requires_action',
];

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private stripeService: StripeService,
    private stripePaymentIntentRepository: StripePaymentIntentRepository,
    private purchaseService: PurchasesService,
    private teacherRepository: TeacherRepository,
    private bookingsService: BookingsService,
    private stripeEventRepository: StripeEventRepository,
  ) {}

  private get stripe(): Stripe {
    return this.stripeService.stripe;
  }

  async createPurchasePaymentIntent(
    purchaseId: string,
    user: IRequestUser,
  ): Promise<{ client_secret: string; amount: number }> {
    const purchase = await this.purchaseService.findOwned(purchaseId, user);

    if (purchase.user.id !== user.id) {
      throw new ForbiddenException("You can't pay this order");
    }

    if (purchase.purch_is_paid) {
      throw new BadRequestException('This order has already been paid');
    }

    const amount = toCents(purchase.purch_total);

    if (amount < 50) {
      throw new BadRequestException(
        'The order total is too low to be paid by card',
      );
    }

    if (purchase.purch_payment_intent_id) {
      const existing = await this.stripe.paymentIntents.retrieve(
        purchase.purch_payment_intent_id,
      );

      if (
        REUSABLE_INTENT_STATUSES.includes(existing.status) &&
        existing.amount === amount
      ) {
        return {
          client_secret: existing.client_secret,
          amount: purchase.purch_total,
        };
      }

      if (existing.status === 'succeeded' || existing.status === 'processing') {
        throw new BadRequestException('This order is already being paid');
      }
    }

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: purchase.purch_currency,
      customer: user.customerId || undefined,
      receipt_email: purchase.user.email,
      description: `K-Progressed order ${purchase.purch_reference}`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        purchaseId: String(purchase._id),
        userId: user.id,
        reference: purchase.purch_reference,
      },
    });

    await this.purchaseService.attachPaymentIntent(
      purchase._id,
      paymentIntent.id,
    );

    return {
      client_secret: paymentIntent.client_secret,
      amount: purchase.purch_total,
    };
  }

  async createMentoringPaymentIntent(
    bookingRequest: CreateMentoringPaymentIntent,
    booker: IRequestUser,
  ): Promise<{ client_secret: string; amount: number }> {
    const teacher = await this.teacherRepository.findById(
      new Types.ObjectId(bookingRequest.teacherId),
    );

    if (!teacher.tchr_is_mentor || !(teacher.tchr_hourly_rate > 0)) {
      throw new BadRequestException('This teacher does not offer mentoring');
    }

    const booking = await this.bookingsService.hold({
      teacher,
      bookerId: booker.id,
      date: bookingRequest.date,
      time: bookingRequest.time,
    });

    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: toCents(teacher.tchr_hourly_rate),
      currency: 'eur',
      customer: booker.customerId || undefined,
      receipt_email: booker.email,
      description: `K-Progressed mentoring call ${bookingRequest.date} ${bookingRequest.time}`,
      automatic_payment_methods: { enabled: true },
      metadata: {
        teacherId: teacher._id.toString(),
        bookingId: booking._id.toString(),
        userId: booker.id,
      },
    });

    await this.bookingsService.attachPaymentIntent(
      booking._id,
      paymentIntent.id,
    );

    return {
      client_secret: paymentIntent.client_secret,
      amount: teacher.tchr_hourly_rate,
    };
  }

  async refundPurchase(purchaseId: string): Promise<{ status: string }> {
    const purchase = await this.purchaseService.findById(purchaseId);

    if (!purchase.purch_is_paid) {
      throw new BadRequestException('Only paid orders can be refunded');
    }

    if (!purchase.purch_payment_intent_id) {
      await this.purchaseService.markRefundedWithoutPayment(purchase._id);

      return { status: 'refunded' };
    }

    try {
      await this.stripe.refunds.create({
        payment_intent: purchase.purch_payment_intent_id,
      });
    } catch (error: unknown) {
      this.logger.error('Failed to refund the order', errorStack(error));
      throw new BadRequestException(errorMessage(error) ?? 'The refund failed');
    }

    await this.purchaseService.markRefunded(purchase.purch_payment_intent_id);

    return { status: 'refunded' };
  }

  private async savePaymentInformation(intent: Stripe.PaymentIntent) {
    if (!intent.latest_charge) {
      return;
    }

    const charge =
      typeof intent.latest_charge === 'string'
        ? await this.stripe.charges.retrieve(intent.latest_charge)
        : intent.latest_charge;

    await this.stripePaymentIntentRepository.create({
      strp_paym_amount: charge.amount / 100,
      strp_paym_currency: charge.currency,
      strp_paym_status: charge.status,
      strp_paym_type: charge.payment_method_details?.type ?? 'unknown',
      strp_paym_exp_month: charge.payment_method_details?.card?.exp_month,
      strp_paym_exp_year: charge.payment_method_details?.card?.exp_year,
      strp_paym_billing_details: charge.billing_details,
      strp_customer_id: (charge.customer as string) ?? undefined,
      strp_payment_intent_id: intent.id,
      purchase_id: intent.metadata?.purchaseId,
      booking_id: intent.metadata?.bookingId,
    });
  }

  constructEvent(
    payload: string | Buffer,
    header: string | Buffer | Array<string>,
  ): Stripe.Event {
    const webhookSecret = process.env.WEBHOOK_STRIPE_SECRET;

    if (!webhookSecret) {
      this.logger.error('WEBHOOK_STRIPE_SECRET is not configured');
      throw new InternalServerErrorException('Webhook is not configured');
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        header,
        webhookSecret,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `Webhook signature verification failed: ${errorMessage(error)}`,
      );
      throw new BadRequestException('Invalid signature');
    }
  }

  async webhook(
    payload: string | Buffer,
    header: string | Buffer | Array<string>,
  ): Promise<{ received: boolean }> {
    const event = this.constructEvent(payload, header);

    try {
      await this.stripeEventRepository.create({
        event_id: event.id,
        event_type: event.type,
      });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        return { received: true };
      }

      throw error;
    }

    try {
      await this.handleEvent(event);
    } catch (error) {
      await this.stripeEventRepository.findOneAndDelete({ event_id: event.id });
      throw error;
    }

    return { received: true };
  }

  private async handleEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.onPaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled':
        await this.onPaymentFailed(event.data.object);
        break;
      case 'charge.refunded':
        await this.onChargeRefunded(event.data.object);
        break;
      default:
        break;
    }
  }

  private async onPaymentSucceeded(intent: Stripe.PaymentIntent) {
    const { purchaseId, bookingId } = intent.metadata ?? {};

    await this.savePaymentInformation(intent).catch((error) =>
      this.logger.error(
        'Failed to save the payment information',
        errorStack(error),
      ),
    );

    if (purchaseId) {
      await this.purchaseService.markPaid(
        purchaseId,
        intent.id,
        intent.amount_received,
        intent.currency,
      );
    }

    if (bookingId) {
      try {
        await this.bookingsService.confirm(bookingId);
      } catch (error) {
        if (error instanceof ConflictException) {
          this.logger.warn(`Slot conflict for booking ${bookingId}, refunding`);
          await this.bookingsService.cancelAfterPaymentConflict(bookingId);
        } else {
          throw error;
        }
      }
    }
  }

  private async onPaymentFailed(intent: Stripe.PaymentIntent) {
    if (intent.metadata?.bookingId) {
      await this.bookingsService.releaseHold(intent.metadata.bookingId);
    }
  }

  private async onChargeRefunded(charge: Stripe.Charge) {
    if (!charge.refunded || typeof charge.payment_intent !== 'string') {
      return;
    }

    await this.purchaseService.markRefunded(charge.payment_intent);
    await this.bookingsService.markRefunded(charge.payment_intent);
  }
}

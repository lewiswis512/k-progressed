import { BadRequestException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { StripeService } from '../../../modules/payment/service/stripe.service';
import { StripePaymentIntentRepository } from '../repository/stripePaymentIntent.repository';
import { IBillingDetail } from '../schemas/stripe-payment-intent.schema';
import Stripe from 'stripe';
import { TeacherRepository } from '../../../modules/learning/repositories/teacher.repository';
import { CreateMentoringPaymentIntent } from '../dto/create-mentoring-payment-intent.dto';
import { PurchasesService } from '../../../modules/purchases/purchases.service';
import {
  IBookingInformation,
  MentorBookingNotificationService,
} from '../../../modules/learning/services/mentor-booking-notification.service';

interface IPayInfoData {
  strp_paym_amount: number;
  strp_paym_currency: string;
  strp_paym_status: string;
  strp_paym_type: string;
  strp_paym_exp_month: number;
  strp_paym_exp_year: number;
  strp_paym_billing_details: IBillingDetail;
  strp_customer_id: string;
}

export interface IBooker {
  username: string;
  firstname?: string;
  lastname?: string;
  email: string;
  customerId?: string;
}

@Injectable()
export class PaymentService extends StripeService {
  constructor(
    private stripePaymentIntentRepository: StripePaymentIntentRepository,
    private purchaseService: PurchasesService,
    private mentorBookingNotificationService: MentorBookingNotificationService,
    private teacherRepository: TeacherRepository,
  ) {
    super();
  }

  async createPaymentIntent(data: any) {
    try {
      return await this.stripe.paymentIntents.create(data);
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  async createMentoringPaymentIntent(
    booking: CreateMentoringPaymentIntent,
    booker: IBooker,
  ): Promise<{ client_secret: string; amount: number }> {
    const teacher = await this.teacherRepository.findById(
      new Types.ObjectId(booking.teacherId),
      {
        populate: {
          path: 'author',
          select: 'usr_username usr_firstname usr_lastname usr_email',
        },
      },
    );

    if (!teacher.tchr_is_mentor || !(teacher.tchr_hourly_rate > 0)) {
      throw new BadRequestException('This teacher does not offer mentoring');
    }

    const author = teacher.author;
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(teacher.tchr_hourly_rate * 100),
      currency: 'eur',
      customer: booker.customerId || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        teacherId: teacher._id.toString(),
        date: booking.date,
        time: booking.time,
        bookerFirstname: booker.firstname || booker.username,
        bookerLastname: booker.lastname || booker.username,
        bookerEmail: booker.email,
        teacherFirstname: author.usr_firstname || author.usr_username,
        teacherLastname: author.usr_lastname || author.usr_username,
        teacherEmail: author.usr_email,
      },
    });

    return {
      client_secret: paymentIntent.client_secret,
      amount: teacher.tchr_hourly_rate,
    };
  }

  async savePaymentInformation(charge: Stripe.Charge) {
    try {
      const payInfoData: IPayInfoData = {
        strp_paym_amount: charge.amount / 100,
        strp_paym_currency: charge.currency,
        strp_paym_status: charge.status,
        strp_paym_type: charge.payment_method_details.type,
        strp_paym_exp_month: charge.payment_method_details.card.exp_month,
        strp_paym_exp_year: charge.payment_method_details.card.exp_year,
        strp_paym_billing_details: charge.billing_details,
        strp_customer_id: charge.customer as string,
      };

      return await this.stripePaymentIntentRepository.create(payInfoData);
    } catch (error) {
      console.error('Error saving payment information:', error);
      throw error;
    }
  }

  async webhook(
    payload: string | Buffer,
    header: string | Buffer | Array<string>,
    webhookSecret: string,
  ): Promise<void> {
    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        event = this.stripe.webhooks.constructEvent(
          payload,
          header,
          webhookSecret,
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
        const charge: Stripe.Charge = event.data.object;
        const { metadata } = charge;

        await this.savePaymentInformation(charge);

        if (metadata.purchaseId) {
          await this.purchaseService.validatePurchase(metadata.purchaseId);
        }

        if (
          metadata.date &&
          metadata.time &&
          metadata.bookerLastname &&
          metadata.bookerFirstname &&
          metadata.bookerEmail &&
          metadata.teacherLastname &&
          metadata.teacherFirstname &&
          metadata.teacherEmail
        ) {
          const bookingInfo: IBookingInformation = {
            date: new Date(metadata.date),
            time: metadata.time,
            bookerLastname: metadata.bookerLastname,
            bookerFirstname: metadata.bookerFirstname,
            bookerEmail: metadata.bookerEmail,
            teacherLastname: metadata.teacherLastname,
            teacherFirstname: metadata.teacherFirstname,
            teacherEmail: metadata.teacherEmail,
          };

          this.mentorBookingNotificationService.send(bookingInfo);
        }

        console.info('Charge succeeded');
        break;
      case 'charge.updated':
        console.info('Charge updated');
        break;
      case 'customer.created':
        console.info('customer created');
        break;
      case 'charge.failed':
        throw new Error(
          `Charge failed: ${JSON.stringify(event.data.object, null, 2)}`,
        );
      default:
        throw new Error(`Unhandled event type ${event.type}`);
    }
  }
}

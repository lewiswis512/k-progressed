import { Injectable } from '@nestjs/common';
import { StripeService } from '../../../modules/payment/service/stripe.service';
import { StripePaymentIntentRepository } from '../repository/stripePaymentIntent.repository';
import { IBillingDetail } from '../schemas/stripe-payment-intent.schema';
import Stripe from 'stripe';
import { PurchasesService } from '../../../modules/purchases/purchases.service';

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

@Injectable()
export class PaymentService extends StripeService {
  constructor(
    private stripePaymentIntentRepository: StripePaymentIntentRepository,
    private purchaseService: PurchasesService,
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

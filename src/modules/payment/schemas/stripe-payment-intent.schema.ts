import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema } from 'mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';

export interface IBillingDetail {
  name: string;
  email: string;
  address: {
    city: string;
    line1: string;
    postal_code: string;
  };
}

export const BillingDetailsSchema = new MongooseSchema(
  {
    name: { type: String },
    email: { type: String },
    address: {
      city: { type: String },
      line1: { type: String },
      postal_code: { type: String },
    },
  },
  { _id: false },
);

@Schema({
  collection: 'stripe-payment-intents',
})
export class StripePaymentIntent extends AbstractDocument {
  @Prop({ type: Number, required: true })
  strp_paym_amount: number;

  @Prop({ type: String, required: true })
  strp_paym_currency: string;

  @Prop({ type: String, required: true })
  strp_paym_status: string;

  @Prop({ type: String, required: true })
  strp_paym_type: string;

  @Prop({ type: Number })
  strp_paym_exp_month?: number;

  @Prop({ type: Number })
  strp_paym_exp_year?: number;

  @Prop({ type: BillingDetailsSchema })
  strp_paym_billing_details?: IBillingDetail;

  @Prop({ type: String })
  strp_payment_intent_id?: string;

  @Prop({ type: String })
  booking_id?: string;

  @Prop({ type: String })
  strp_customer_id: string;

  @Prop({ type: String })
  purchase_id: string;
}

export const StripePaymentIntentSchema =
  SchemaFactory.createForClass(StripePaymentIntent);

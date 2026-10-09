import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as SchemaMongoose } from 'mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { PaymentMethodEnum } from '../../../utils/enums/payment-method.enum';

export enum PurchaseStatusEnum {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export interface ICourse {
  id: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  qty: number;
}

export interface IUserInfo {
  id: string;
  name: string;
  email: string;
  address: {
    city: string;
    line1: string;
    postal_code: string;
    country?: string;
  };
}

const UserInfoSchema = new SchemaMongoose(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: {
      city: { type: String, required: true },
      line1: { type: String, required: true },
      postal_code: { type: String, required: true },
      country: { type: String },
    },
  },
  { _id: false },
);

const CourseInfoSchema = new SchemaMongoose(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true },
    image: { type: String, default: '' },
    price: { type: Number, required: true },
    qty: { type: Number, default: 1 },
  },
  { _id: false },
);

@Schema({
  collection: 'purchases',
})
export class Purchase extends AbstractDocument {
  @Prop({ type: String, trim: true, required: true })
  purch_reference: string;

  @Prop({ type: Number, enum: PaymentMethodEnum })
  payment_method: PaymentMethodEnum;

  @Prop({ type: UserInfoSchema })
  user: IUserInfo;

  @Prop({ type: [CourseInfoSchema] })
  purchaseItems: ICourse[];

  @Prop({ type: Number, default: 0 })
  purch_total: number;

  @Prop({ type: String, default: 'eur' })
  purch_currency: string;

  @Prop({
    type: String,
    enum: PurchaseStatusEnum,
    default: PurchaseStatusEnum.PENDING,
  })
  purch_status: PurchaseStatusEnum;

  @Prop({ type: String })
  purch_payment_intent_id?: string;

  @Prop({ type: Date, default: () => new Date() })
  purch_date_at: Date;

  @Prop({ type: Date })
  purch_paid_at?: Date;

  @Prop({ type: Date })
  purch_refunded_at?: Date;

  @Prop({ type: Boolean, default: false })
  purch_is_paid: boolean;
}

export const PurchaseSchema = SchemaFactory.createForClass(Purchase);

PurchaseSchema.index({ 'user.id': 1, purch_is_paid: 1 });
PurchaseSchema.index({ 'purchaseItems.id': 1, purch_is_paid: 1 });
PurchaseSchema.index({ purch_payment_intent_id: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { BookingStatusEnum } from '../../../utils/enums/booking-status.enum';
import { User } from '../../users/schemas/user.schema';
import { Teacher } from './teachers/teacher.schema';

@Schema({
  collection: 'bookings',
})
export class Booking extends AbstractDocument {
  @Prop({ type: String, required: true })
  bkng_date: string;

  @Prop({ type: String, required: true })
  bkng_time: string;

  @Prop({
    type: Number,
    enum: BookingStatusEnum,
    default: BookingStatusEnum.PENDING,
  })
  bkng_status: BookingStatusEnum;

  @Prop({ type: Date })
  bkng_expires_at?: Date;

  @Prop({ type: String })
  bkng_payment_intent_id?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true,
  })
  teacher: Teacher;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  booker: User;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

BookingSchema.index({ teacher: 1, bkng_date: 1, bkng_time: 1 });
BookingSchema.index(
  { teacher: 1, bkng_date: 1, bkng_time: 1 },
  {
    unique: true,
    name: 'unique_confirmed_slot',
    partialFilterExpression: { bkng_status: BookingStatusEnum.CONFIRMED },
  },
);

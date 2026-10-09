import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';

@Schema({ collection: 'stripe-events' })
export class StripeEvent extends AbstractDocument {
  @Prop({ type: String, required: true, unique: true })
  event_id: string;

  @Prop({ type: String, required: true })
  event_type: string;
}

export const StripeEventSchema = SchemaFactory.createForClass(StripeEvent);

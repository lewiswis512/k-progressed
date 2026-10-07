import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';

@Schema({
  collection: 'faqs',
})
export class Faq extends AbstractDocument {
  @Prop({ type: String, trim: true, required: true })
  faq_question: string;

  @Prop({ type: String, trim: true, required: true })
  faq_answer: string;

  @Prop({ type: Number, default: 0 })
  faq_order: number;

  @Prop({ type: Boolean, default: true })
  faq_isPublished: boolean;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);

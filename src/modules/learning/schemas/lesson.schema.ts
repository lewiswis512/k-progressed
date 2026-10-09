import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { Section } from './section.schema';
import mongoose from 'mongoose';

@Schema({
  collection: 'lessons',
})
export class Lesson extends AbstractDocument {
  @Prop({ type: String, trim: true, required: true })
  lssn_title: string;

  @Prop({ type: String, trim: true, required: true })
  lssn_video_link?: string;

  @Prop({ type: String, trim: true, required: true })
  lssn_video_photo?: string;

  @Prop({ type: Boolean, default: false })
  lssn_is_free: boolean;

  @Prop({ type: String, trim: true })
  lssn_duration: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Section' })
  section: Section;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

LessonSchema.index({ section: 1 });

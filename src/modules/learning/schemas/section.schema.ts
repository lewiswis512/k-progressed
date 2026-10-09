import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { Course } from './course.schema';
import mongoose from 'mongoose';

@Schema({
  collection: 'sections',
})
export class Section extends AbstractDocument {
  @Prop({ type: String, required: true, trim: true })
  sect_title: string;

  @Prop({ type: Number, default: 0 })
  sect_order: number;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Course' })
  course: Course;
}

export const SectionSchema = SchemaFactory.createForClass(Section);

SectionSchema.index({ course: 1, sect_order: 1 });

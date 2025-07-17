import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { LevelEnum } from '../../../utils/enums/level.enum';
import { Category } from './category.schema';
import { User } from '../../../modules/users/schemas/user.schema';
import { Teacher } from './teachers/teacher.schema';

@Schema({
  collection: 'courses',
})
export class Course extends AbstractDocument {
  @Prop({ type: String, trim: true, required: true })
  crs_title: string;

  @Prop({ type: String, trim: true, required: true })
  crs_slug: string;

  @Prop({ type: String, trim: true, required: true })
  crs_description: string;

  @Prop({ type: Number, required: true })
  crs_price: number;

  @Prop({ type: Boolean, default: false })
  crs_isPaid: boolean;

  @Prop({ type: Boolean, default: false })
  crs_isValid: boolean;

  @Prop({ type: String, default: '' })
  crs_photo: string;

  @Prop({ type: Number, enum: LevelEnum })
  level_id: LevelEnum;

  @Prop({ type: Boolean, default: false })
  crs_isApprouved: boolean;

  @Prop({ type: mongoose.Schema.ObjectId, ref: 'User' })
  author: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Category' })
  category: Category;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' })
  teacher: Teacher;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

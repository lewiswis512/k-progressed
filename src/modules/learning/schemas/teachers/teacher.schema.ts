import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AbstractDocument } from '../../../../common/document/abstract.document';
import { User } from '../../../../modules/users/schemas/user.schema';

export interface IMentorAvailability {
  day: number;
  times: string[];
}

const MentorAvailabilitySchema = new mongoose.Schema<IMentorAvailability>(
  {
    day: { type: Number, min: 0, max: 6, required: true },
    times: { type: [String], default: [] },
  },
  { _id: false },
);

@Schema({
  collection: 'teachers',
})
export class Teacher extends AbstractDocument {
  @Prop({ type: String, trim: true })
  tchr_title: string;

  @Prop({ type: String, trim: true })
  tchr_biography: string;

  @Prop({ type: Boolean, default: false })
  tchr_is_mentor: boolean;

  @Prop({ type: Number, default: 0, min: 0 })
  tchr_hourly_rate: number;

  @Prop({ type: [MentorAvailabilitySchema], default: undefined })
  tchr_availability?: IMentorAvailability[];

  @Prop({ type: mongoose.Schema.ObjectId, ref: 'User' })
  author: User;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);

TeacherSchema.index(
  { author: 1 },
  { unique: true, name: 'unique_teacher_author' },
);

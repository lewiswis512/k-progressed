import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbstractDocument } from '../../common/document/abstract.document';
import { User } from '../users/schemas/user.schema';
import { Course } from '../learning/schemas/course.schema';
import { Lesson } from '../learning/schemas/lesson.schema';

@Schema({ collection: 'lesson-progress' })
export class LessonProgress extends AbstractDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: User;

  @Prop({ type: Types.ObjectId, ref: 'Course', required: true })
  course: Course;

  @Prop({ type: Types.ObjectId, ref: 'Lesson', required: true })
  lesson: Lesson;

  @Prop({ type: Date, default: () => new Date() })
  completed_at: Date;
}

export const LessonProgressSchema = SchemaFactory.createForClass(LessonProgress);

LessonProgressSchema.index({ user: 1, lesson: 1 }, { unique: true });
LessonProgressSchema.index({ user: 1, course: 1 });

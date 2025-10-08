import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { CommentEnum } from '../../../utils/enums/comment.enum';
import { Course } from '../../learning/schemas/course.schema';
import { Lesson } from '../../learning/schemas/lesson.schema';
import { User } from '../../users/schemas/user.schema';

@Schema({
  collection: 'comments',
})
export class Comment extends AbstractDocument {
  @Prop({ type: Number, default: null })
  comm_rating?: number;

  @Prop({ type: String, trim: true, required: true })
  comm_content: string;

  @Prop({ type: Number, trim: true, required: true, enum: CommentEnum })
  comm_source: CommentEnum;

  @Prop({ type: mongoose.Schema.ObjectId, ref: 'User' })
  author: User;

  @Prop({ type: mongoose.Schema.ObjectId, ref: 'Course' })
  course: Course;

  @Prop({ type: mongoose.Schema.ObjectId, ref: 'Lesson' })
  lesson: Lesson;

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parent_comment: Types.ObjectId;

  @Prop({ type: [mongoose.Schema.ObjectId], ref: 'Comment' })
  replies: Comment[];

  @Prop({ type: Number, default: 0 })
  comm_count_like: number;

  @Prop({ type: [mongoose.Schema.ObjectId], ref: 'User' })
  comm_liked_by: User[];

  @Prop({ type: Number, default: 0 })
  comm_count_dislike: number;

  @Prop({ type: [mongoose.Schema.ObjectId], ref: 'User' })
  comm_disliked_by: User[];
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

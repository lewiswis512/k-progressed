import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { Course } from 'src/modules/learning/schemas/course.schema';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { ICommentLesson } from '../../../interfaces/comments/ICommentLesson';
import { ICommentReplies } from '../../../interfaces/comments/ICommentReplies';
import { CommentEnum } from '../../../utils/enums/comment.enum';
import { User } from '../../users/schemas/user.schema';
import { CommentLesson } from './comment-lesson.schema';
import { CommentReplies } from './comment-replies.schema';

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

  @Prop({ type: CommentLesson })
  lesson: ICommentLesson;

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parent_comment: Types.ObjectId;

  @Prop({ type: [CommentReplies] })
  replies: [ICommentReplies];

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

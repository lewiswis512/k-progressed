import { Types } from 'mongoose';
import { Course } from 'src/modules/learning/schemas/course.schema';
import { User } from '../../modules/users/schemas/user.schema';
import { CommentEnum } from '../../utils/enums/comment.enum';
import { ICommentLesson } from './ICommentLesson';

export interface ICommentReplies {
  _id: Types.ObjectId;
  comm_rating?: number;
  comm_content: string;
  comm_source: CommentEnum;
  author: User;
  course: Course;
  lesson: ICommentLesson;
  comm_count_like: number;
  comm_liked_by: User[];
  comm_count_dislike: number;
  comm_disliked_by: User[];
  parent_comment: Types.ObjectId;
  replies: [ICommentReplies];
  created_at?: Date;
  updated_at?: Date;
}

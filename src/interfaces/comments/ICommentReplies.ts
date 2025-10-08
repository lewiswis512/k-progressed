import { Types } from 'mongoose';
import { Course } from '../../modules/learning/schemas/course.schema';
import { Lesson } from '../../modules/learning/schemas/lesson.schema';
import { User } from '../../modules/users/schemas/user.schema';
import { CommentEnum } from '../../utils/enums/comment.enum';

export interface ICommentReplies {
  _id: Types.ObjectId;
  comm_rating?: number;
  comm_content: string;
  comm_source: CommentEnum;
  author: User;
  course: Course;
  lesson: Lesson;
  comm_count_like: number;
  comm_liked_by: User[];
  comm_count_dislike: number;
  comm_disliked_by: User[];
  parent_comment: Types.ObjectId;
  replies: Comment[];
  created_at?: Date;
  updated_at?: Date;
}

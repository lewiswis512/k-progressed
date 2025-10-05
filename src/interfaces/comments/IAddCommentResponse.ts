import { Types } from 'mongoose';
import { User } from '../../modules/users/schemas/user.schema';
import { CommentEnum } from '../../utils/enums/comment.enum';

export interface IAddCommentResponse {
  _id: Types.ObjectId;
  comm_rating?: number;
  comm_content: string;
  comm_source: CommentEnum;
  author: {
    _id: Types.ObjectId;
    usr_photo: string;
    usr_username: string;
    usr_firstname: string;
    usr_lastname: string;
  };
  course: {
    _id: Types.ObjectId;
    crs_title: string;
  };
  lesson: {
    _id: Types.ObjectId;
    lssn_title: string;
  };
  parent_comment: Types.ObjectId;
  replies: IAddCommentResponse[];
  comm_count_like: number;
  comm_liked_by: User[];
  comm_count_dislike: number;
  comm_disliked_by: User[];
  created_at: Date;
  updated_at: Date;
}

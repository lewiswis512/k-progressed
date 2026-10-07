import { Types } from 'mongoose';
import { CourseStatusEnum } from '../../../utils/enums/course-status.enum';

export interface IAdminCourse {
  _id: Types.ObjectId;
  crs_title: string;
  crs_slug: string;
  crs_photo: string;
  crs_price: number;
  crs_isPaid: boolean;
  crs_status: CourseStatusEnum;
  level_id: number;
  author?: {
    _id: Types.ObjectId;
    usr_username: string;
    usr_firstname?: string;
    usr_lastname?: string;
    usr_email: string;
  };
  category?: {
    _id: Types.ObjectId;
    ctgr_name: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface IAdminCoursePagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: IAdminCourse[];
}

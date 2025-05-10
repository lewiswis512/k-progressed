import { Types } from 'mongoose';
import { Category } from '../../modules/learning/schemas/category.schema';
import { LevelEnum } from '../../utils/enums/level.enum';

export interface ISaveCourse {
  crs_title: string;
  crs_slug?: string;
  crs_description: string;
  crs_price: number;
  crs_isPaid: boolean;
  level_id: LevelEnum;
  crs_photo?: string;
  category: Category;
}

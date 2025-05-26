import { LevelEnum } from '../../utils/enums/level.enum';
import { Category } from '../../modules/learning/schemas/category.schema';
import { Teacher } from '../../modules/teachers/schemas/teacher.schema';

export interface ISaveCourse {
  crs_title: string;
  crs_slug?: string;
  crs_description: string;
  crs_price: number;
  crs_isPaid: boolean;
  level_id: LevelEnum;
  crs_photo?: string;
  category: Category;
  teacher: Teacher;
}

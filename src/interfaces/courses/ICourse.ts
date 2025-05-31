import { LevelEnum } from '../../utils/enums/level.enum';

export interface ICourse {
  crs_title: string;
  crs_slug: string;
  crs_description: string;
  crs_price: number;
  crs_isPaid: boolean;
  crs_photo: string;
  level_id: LevelEnum;
}

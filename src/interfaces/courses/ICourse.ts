import { LevelEnum } from '../../utils/enums/level.enum';
import { IUser } from '../users/IUser';

export interface ICourse {
  crs_title: string;
  crs_slug: string;
  crs_description: string;
  crs_price: number;
  crs_isPaid: boolean;
  crs_photo: string;
  author: IUser;
  level_id: LevelEnum;
}

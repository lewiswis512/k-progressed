import { Types } from 'mongoose';
import { RoleEnum } from '../../utils/enums/role.enum';
import { UserTypeEnum } from '../../utils/enums/user-type.enum';

export interface IUser {
  _id: Types.ObjectId;
  usr_username: string;
  usr_firstname?: string;
  usr_lastname?: string;
  usr_email: string;
  usr_photo?: string;
  usr_registered_date: Date;
  stripe_customer_id: string;
  usr_type: UserTypeEnum;
  usr_role: RoleEnum;
  created_at?: Date;
  updated_at?: Date;
}

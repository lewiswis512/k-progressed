import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { UserTypeEnum } from '../../../utils/enums/user-type.enum';

@Schema({
  collection: 'users',
})
export class User extends AbstractDocument {
  @Prop({ type: String, trim: true })
  usr_photo?: string;

  @Prop({ type: String, required: true, trim: true })
  usr_username: string;

  @Prop({ type: String, trim: true })
  usr_firstname?: string;

  @Prop({ type: String, trim: true })
  usr_lastname?: string;

  @Prop({ type: String, trim: true })
  usr_slug?: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  usr_email: string;

  @Prop({ type: String, required: true, trim: true, minlength: 8, select: false })
  usr_password: string;

  @Prop({ type: Boolean })
  usr_email_verified?: boolean;

  @Prop({ type: Date })
  usr_password_changed_at?: Date;

  @Prop({ type: Number, default: 0 })
  usr_token_version?: number;

  @Prop({ type: Date, required: true, default: () => new Date() })
  usr_registered_date: Date;

  @Prop({ type: Number, default: UserTypeEnum.STUDENT })
  usr_type: UserTypeEnum;

  @Prop({ type: String, trim: true })
  stripe_customer_id: string;

  @Prop({
    type: Number,
    required: true,
    enum: RoleEnum,
    default: RoleEnum.USER,
  })
  usr_role: RoleEnum;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ usr_slug: 1 });

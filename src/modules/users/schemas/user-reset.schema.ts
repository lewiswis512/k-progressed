import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';

export enum UserTokenTypeEnum {
  RESET_PASSWORD = 'reset',
  VERIFY_EMAIL = 'verify',
}

@Schema()
export class UserReset extends AbstractDocument {
  @Prop({ type: String, required: true, trim: true })
  usr_rest_email: string;

  @Prop({ type: String, required: true, trim: true })
  usr_rest_token: string;

  @Prop({ type: Date, required: true })
  usr_rest_expired_at: Date;

  @Prop({
    type: String,
    enum: UserTokenTypeEnum,
    default: UserTokenTypeEnum.RESET_PASSWORD,
  })
  usr_rest_type: UserTokenTypeEnum;
}

export const UserResetSchema = SchemaFactory.createForClass(UserReset);

UserResetSchema.index({ usr_rest_token: 1 });
UserResetSchema.index({ usr_rest_expired_at: 1 }, { expireAfterSeconds: 0 });

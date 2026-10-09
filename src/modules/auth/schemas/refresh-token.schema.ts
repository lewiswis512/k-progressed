import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';
import { User } from '../../users/schemas/user.schema';

@Schema({ collection: 'refresh-tokens' })
export class RefreshToken extends AbstractDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  rfsh_user: User;

  @Prop({ type: String, required: true, unique: true })
  rfsh_token: string;

  @Prop({ type: Date })
  rfsh_used_at?: Date;

  @Prop({ type: Date, required: true })
  rfsh_expired_at: Date;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);

RefreshTokenSchema.index({ rfsh_user: 1 });
RefreshTokenSchema.index({ rfsh_expired_at: 1 }, { expireAfterSeconds: 0 });

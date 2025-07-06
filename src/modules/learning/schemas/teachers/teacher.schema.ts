import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { AbstractDocument } from '../../../../common/document/abstract.document';
import { User } from '../../../../modules/users/schemas/user.schema';

@Schema({
  collection: 'teachers',
})
export class Teacher extends AbstractDocument {
  @Prop({ type: String, trim: true })
  tchr_title: string;

  @Prop({ type: String, trim: true })
  tchr_biography: string;

  @Prop({ type: mongoose.Schema.ObjectId, ref: 'User' })
  author: User;
}

export const TeacherSchema = SchemaFactory.createForClass(Teacher);

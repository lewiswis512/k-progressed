import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '../../../common/document/abstract.document';

@Schema({
  collection: 'categories',
})
export class Category extends AbstractDocument {
  @Prop({ type: String, trim: true, required: true })
  ctgr_name: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

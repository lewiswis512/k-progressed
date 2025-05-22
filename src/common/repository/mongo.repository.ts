import { Connection } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { IRepository } from '../interfaces/IRepository';
import { ModelSchema } from '../../shared/schema/model-schema';

@Injectable()
export class MongooseRepository implements IRepository {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async exists(
    collectionName: string,
    field: string,
    value: string,
  ): Promise<boolean> {
    const model = new ModelSchema(this.connection, collectionName).generate();
    const result = await model.findOne({ [field]: value }).select(field);

    return !result;
  }
}

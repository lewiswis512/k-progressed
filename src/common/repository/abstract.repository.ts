import { Logger, NotFoundException } from '@nestjs/common';
import {
  FilterQuery,
  Model,
  Types,
  UpdateQuery,
  UpdateWriteOpResult,
  Document,
  HydratedDocument,
} from 'mongoose';
import { AbstractDocument } from '../document/abstract.document';

type AggregationPipelineStage =
  | { $match: { [key: string]: any } }
  | { $project: { [key: string]: any } }
  | { $group: { [key: string]: any } }
  | { $sort: { [key: string]: 1 | -1 } }
  | { $unwind: string }
  | { $limit: number }
  | { $skip: number }
  | { $addFields: { [key: string]: any } }
  | { $set: { [key: string]: any } }
  | { $replaceRoot: { newRoot: any } };

export type Aggregation =
  | { $match: { [key: string]: any } }
  | { $unwind: string | { path: string; preserveNullAndEmptyArrays?: boolean } }
  | { $group: { _id: string } }
  | { $project: { [key: string]: any } }
  | { $count: string }
  | {
      $lookup: {
        from: string;
        localField: string;
        foreignField: string;
        as: string;
      };
    }
  | {
      $lookup: {
        from: string;
        let?: Record<string, unknown>;
        pipeline: AggregationPipelineStage[];
        as: string;
      };
    }
  | { $addFields: { [key: string]: any } };

export abstract class AbstractRepository<TDocument extends AbstractDocument> {
  protected abstract readonly logger: Logger;

  constructor(protected readonly model: Model<TDocument>) {}

  async find(filterQuery?: FilterQuery<TDocument>): Promise<TDocument[]> {
    return await this.model.find(filterQuery).sort({ created_at: -1 });
  }

  async findById(id: Types.ObjectId): Promise<TDocument> {
    const document = await this.model.findById(id);

    if (!document) {
      throw new NotFoundException(`${this.model.modelName} not found`);
    }

    return document;
  }

  async findOne(filterQuery: FilterQuery<TDocument>): Promise<TDocument> {
    const document = await this.model.findOne(filterQuery);

    if (!document) {
      throw new NotFoundException(`${this.model.modelName} not found`);
    }

    return document;
  }

  async findOneOrNull(
    filterQuery: FilterQuery<TDocument>,
  ): Promise<TDocument | null> {
    const document = await this.model.findOne(filterQuery);

    return document;
  }

  async aggregate(aggregation: Aggregation[]): Promise<any[]> {
    return await this.model.aggregate(aggregation);
  }

  async create(document: Partial<TDocument>): Promise<TDocument> {
    const documentToCreate = new this.model({
      ...document,
      _id: new Types.ObjectId(),
    });

    const createdDocument = await documentToCreate.save();

    return createdDocument.toJSON() as unknown as TDocument;
  }

  async insertMany(documents: Partial<TDocument>[]): Promise<TDocument[]> {
    const docsWithIds = documents.map((doc) => ({
      _id: new Types.ObjectId(),
      ...doc,
    }));

    const createdDocs = await this.model.insertMany(docsWithIds) as HydratedDocument<TDocument>[];

    return createdDocs.map((doc) => doc.toObject());
  }

  async findByIdAndUpdate(
    id: Types.ObjectId,
    data: UpdateQuery<TDocument>,
  ): Promise<TDocument | null> {
    const updatedDocument = await this.model.findByIdAndUpdate(id, data, {
      new: true,
    });

    return updatedDocument as TDocument | null;
  }

  async findOneAndUpdate(
    filterQuery: FilterQuery<TDocument>,
    data: UpdateQuery<TDocument>,
  ): Promise<TDocument | null> {
    const updatedDocument = await this.model.findOneAndUpdate(
      filterQuery,
      data,
      {
        new: true,
      },
    );

    return updatedDocument as TDocument | null;
  }

  async updateMany(
    filterQuery: FilterQuery<TDocument>,
    data: UpdateQuery<TDocument>,
  ): Promise<UpdateWriteOpResult> {
    const updatedDocument = await this.model.updateMany(filterQuery, data, {
      new: true,
    });

    return updatedDocument;
  }

  async findByIdAndDelete(id: Types.ObjectId): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }

  async findOneAndDelete(filterQuery: FilterQuery<TDocument>): Promise<void> {
    const document = await this.model.findOneAndDelete(filterQuery);
  }

  async deleteMany(filterQuery: FilterQuery<TDocument>): Promise<void> {
    await this.model.deleteMany(filterQuery);
  }
}

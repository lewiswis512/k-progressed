import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Faq } from '../schemas/faq.schema';

export class FaqRepository extends AbstractRepository<Faq> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Faq.name) private faqModel: Model<Faq>) {
    super(faqModel);
  }

  async find(filterQuery: FilterQuery<Faq> = {}): Promise<Faq[]> {
    return this.faqModel
      .find(filterQuery)
      .sort({ faq_order: 1, created_at: 1 })
      .lean<Faq[]>(true);
  }

  async reorder(ids: string[]): Promise<void> {
    await this.faqModel.bulkWrite(
      ids.map((id, index) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id) },
          update: { faq_order: index + 1, updated_at: new Date() },
        },
      })),
    );
  }
}

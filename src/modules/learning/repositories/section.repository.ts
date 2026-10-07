import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Section } from '../schemas/section.schema';

export class SectionRepository extends AbstractRepository<Section> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Section.name) private sectionModel: Model<Section>) {
    super(sectionModel);
  }

  async find(
    filterQuery?: FilterQuery<Section>,
    options?: { select?: string; populate?: any },
  ): Promise<Section[]> {
    let query = this.sectionModel.find(filterQuery);

    if (options?.select) {
      query = query.select(options.select);
    }

    if (options?.populate) {
      query = query.populate(options.populate);
    }

    return query.sort({ sect_order: 1, created_at: -1, _id: 1 });
  }

  async nextOrder(courseId: Types.ObjectId): Promise<number> {
    const last = await this.sectionModel
      .findOne({ course: courseId })
      .sort({ sect_order: -1 })
      .select('sect_order')
      .lean();

    return (last?.sect_order ?? 0) + 1;
  }

  async reorder(courseId: Types.ObjectId, ids: string[]): Promise<void> {
    await this.sectionModel.bulkWrite(
      ids.map((id, index) => ({
        updateOne: {
          filter: { _id: new Types.ObjectId(id), course: courseId },
          update: { sect_order: index + 1, updated_at: new Date() },
        },
      })),
    );
  }
}

import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Lesson } from '../schemas/lesson.schema';

export class LessonRepository extends AbstractRepository<Lesson> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Lesson.name) private lessonModel: Model<Lesson>) {
    super(lessonModel);
  }

  async findInCourseOrder(filterQuery: FilterQuery<Lesson>): Promise<Lesson[]> {
    return this.lessonModel.find(filterQuery).sort({ created_at: 1, _id: 1 });
  }
}

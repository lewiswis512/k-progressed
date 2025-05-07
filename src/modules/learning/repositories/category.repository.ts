import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Category } from '../schemas/Category.schema';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

export class CategoryRepository extends AbstractRepository<Category> {
  protected logger: Logger = new Logger();

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {
    super(categoryModel);
  }
}

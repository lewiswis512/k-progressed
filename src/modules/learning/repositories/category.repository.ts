import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category } from '../../learning/schemas/category.schema';

export class CategoryRepository extends AbstractRepository<Category> {
  protected logger: Logger = new Logger();

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {
    super(categoryModel);
  }
}

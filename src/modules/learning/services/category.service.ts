import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { escapeRegex } from '../../../utils/string/escape-regex';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../schemas/category.schema';
import { CourseRepository } from '../repositories/course.repository';
import { SaveCategory } from '../dtos/category/save-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private categoryRepository: CategoryRepository,
    private courseRepository: CourseRepository,
  ) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findById(id: string): Promise<Category> {
    return await this.categoryRepository.findById(new Types.ObjectId(id));
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.categoryRepository.findOneOrNull({
      ctgr_name: new RegExp(`^${escapeRegex(name.trim())}$`, 'i'),
      ...(excludeId ? { _id: { $ne: new Types.ObjectId(excludeId) } } : {}),
    });

    if (existing) {
      throw new ConflictException('This category already exists');
    }
  }

  async store(saveCategory: SaveCategory): Promise<Category> {
    await this.assertNameAvailable(saveCategory.ctgr_name);

    return await this.categoryRepository.create({
      ctgr_name: saveCategory.ctgr_name.trim(),
    });
  }

  async update(id: string, saveCategory: SaveCategory): Promise<Category> {
    await this.findById(id);
    await this.assertNameAvailable(saveCategory.ctgr_name, id);

    return this.categoryRepository.findByIdAndUpdate(new Types.ObjectId(id), {
      ctgr_name: saveCategory.ctgr_name.trim(),
      updated_at: new Date(),
    });
  }

  async delete(id: string): Promise<void> {
    const category = await this.findById(id);
    const courses = await this.courseRepository.countDocuments({
      category: category._id,
    });

    if (courses > 0) {
      throw new BadRequestException(
        'This category is used by courses and cannot be deleted',
      );
    }

    await this.categoryRepository.findByIdAndDelete(category._id);
  }
}

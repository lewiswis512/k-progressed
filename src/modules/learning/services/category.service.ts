import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoryRepository } from '../repositories/category.repository';
import { Category } from '../schemas/category.schema';
import { SaveCategory } from '../dtos/category/save-category.dto';

@Injectable()
export class CategoryService {
  constructor(private categoryRepository: CategoryRepository) {}

  async findAll(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async findById(id: string): Promise<Category> {
    return await this.categoryRepository.findById(new Types.ObjectId(id));
  }

  async store(saveCategory: SaveCategory): Promise<Category> {
    return await this.categoryRepository.create(saveCategory);
  }

  async update(id: string, saveCategory: SaveCategory): Promise<Category> {
    await this.findById(id);

    return this.categoryRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      saveCategory,
    );
  }

  async delete(id: string, authorId: string): Promise<void> {
    await this.findById(id);
    await this.categoryRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}

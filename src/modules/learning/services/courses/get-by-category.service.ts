import { Injectable } from '@nestjs/common';
import { escapeRegex } from '../../../../utils/string/escape-regex';
import { CategoryRepository } from '../../repositories/category.repository';
import { CourseRepository } from '../../repositories/course.repository';
import { Course } from '../../schemas/course.schema';

@Injectable()
export class CoursesByCategoryService {
  public constructor(
    private courseRepository: CourseRepository,
    private categoryRepository: CategoryRepository,
  ) {}

  async findBy(categoryName: string): Promise<Course[]> {
    const categories = await this.categoryRepository.find({
      ctgr_name: new RegExp(`^${escapeRegex(categoryName)}$`, 'i'),
    });

    return await this.courseRepository.find(
      { category: { $in: categories.map((category) => category._id) } },
      {
        populate: {
          path: 'category',
          select: '_id ctgr_name',
        },
      },
    );
  }
}

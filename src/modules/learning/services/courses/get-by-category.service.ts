import { Injectable } from '@nestjs/common';
import { CourseRepository } from '../../repositories/course.repository';
import { Course } from '../../schemas/course.schema';

@Injectable()
export class CoursesByCategoryService {
  public constructor(private courseRepository: CourseRepository) {}

  async findBy(categoryName: string): Promise<Course[]> {
    return await this.courseRepository.find(
      { 'category.ctgr_name': new RegExp(categoryName, 'i') },
      {
        populate: {
          path: 'category',
          select: '_id ctgr_name',
        },
      },
    );
  }
}

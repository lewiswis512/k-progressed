import { Injectable } from '@nestjs/common';
import { Aggregation } from 'src/common/repository/abstract.repository';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class CoursesByCategoryService {
  public constructor(private courseRepository: CourseRepository) {}

  async findBy(categoryName: string) {
    const courseAggregation: Aggregation[] = [
      { $project: { __v: 0 } },
      {
        $lookup: {
          from: 'categories',
          foreignField: '_id',
          localField: 'category',
          pipeline: [{ $project: { _id: 0, ctgr_name: 1 } }],
          as: 'category',
        },
      },
    ];

    courseAggregation.push({
      $match: {
        'category.ctgr_name': new RegExp(categoryName, 'i'),
      },
    });

    return await this.courseRepository.aggregate(courseAggregation);
  }
}

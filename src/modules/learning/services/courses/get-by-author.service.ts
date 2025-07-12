import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Course } from '../../schemas/course.schema';
import { Aggregation } from '../../../../common/repository/abstract.repository';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class CoursesByAuthorService {
  public constructor(private courseRepository: CourseRepository) {}

  async byAuthor(authorId: string): Promise<Course[]> {
    const courseAggregation: Aggregation[] = [
      {
        $match: {
          author: new Types.ObjectId(authorId),
        },
      },
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
      { $unwind: '$category' },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                usr_username: 1,
                usr_firstname: 1,
                usr_lastname: 1,
                usr_email: 1,
              },
            },
          ],
          as: 'author',
        },
      },
      { $unwind: '$author' },
      {
        $lookup: {
          from: 'teachers',
          foreignField: '_id',
          localField: 'teacher',
          pipeline: [
            {
              $project: {
                _id: 0,
                tchr_title: 1,
                tchr_biography: 1,
                author: 1,
              },
            },
          ],
          as: 'teacher',
        },
      },
      { $unwind: '$teacher' },
    ];

    const courses: Course[] =
      await this.courseRepository.aggregate(courseAggregation);

    return courses;
  }
}

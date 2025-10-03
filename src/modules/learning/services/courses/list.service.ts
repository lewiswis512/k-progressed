import { Injectable } from '@nestjs/common';
import { Aggregation } from '../../../../common/repository/abstract.repository';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { pagination } from '../../../../utils/pagination';
import { ICoursePagination } from '../../interfaces/ICoursePagination';
import { CourseRepository } from '../../repositories/course.repository';
import { Course } from '../../schemas/course.schema';
import { GetCoursesWithRatingService } from './get-with-rating.service';

@Injectable()
export class CoursesService {
  public constructor(
    private courseRepository: CourseRepository,
    private GetCoursesWithRatingService: GetCoursesWithRatingService,
  ) {}

  async get(
    keyword: string,
    page: number,
    limit: number,
  ): Promise<ICoursePagination> {
    const keywordToSearch = keyword ? new RegExp(keyword, 'i') : null;
    const courseAggregation: Aggregation[] = [
      { $project: { __v: 0 } },
      { $match: { crs_isValid: true } },
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

    if (keywordToSearch) {
      courseAggregation.push({
        $match: {
          $or: [
            { crs_title: { $regex: keywordToSearch } },
            {
              'author.usr_username': { $regex: keywordToSearch },
            },
            {
              'author.usr_firstname': { $regex: keywordToSearch },
            },
            {
              'author.usr_lastname': { $regex: keywordToSearch },
            },
            {
              'teacher.tchr_title': { $regex: keywordToSearch },
            },
            {
              'category.ctgr_name': { $regex: keywordToSearch },
            },
          ],
        },
      });
    }

    const courses: Course[] =
      await this.courseRepository.aggregate(courseAggregation);

    const coursesWithAverageRating: ICourseWithAverageRating[] =
      await this.GetCoursesWithRatingService.get(courses);
    const paginatedData: ICourseWithAverageRating[] = pagination(
      coursesWithAverageRating,
      page,
      limit,
    );

    return {
      page,
      limit,
      total: coursesWithAverageRating.length,
      totalPages: Math.ceil(coursesWithAverageRating.length / limit),
      data: paginatedData,
    };
  }
}

import { Injectable } from '@nestjs/common';
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
    const criteria: any = {
      crs_isValid: true,
    };

    if (keyword) {
      const regex = new RegExp(keyword, 'i');

      criteria.$or = [
        { crs_title: { $regex: regex } },
        { 'author.usr_username': { $regex: regex } },
        { 'author.usr_firstname': { $regex: regex } },
        { 'author.usr_lastname': { $regex: regex } },
        { 'teacher.tchr_title': { $regex: regex } },
        { 'category.ctgr_name': { $regex: regex } },
      ];
    }
    const courses: Course[] = await this.courseRepository.find(criteria, {
      populate: [
        {
          path: 'category',
          select: 'ctgr_name -_id',
        },
        {
          path: 'author',
          select: 'usr_username usr_firstname usr_lastname usr_email -_id',
        },
        {
          path: 'teacher',
          select: 'tchr_title tchr_biography author -_id',
        },
      ],
    });

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

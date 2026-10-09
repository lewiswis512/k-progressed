import { Injectable } from '@nestjs/common';
import { PublicCourseFilter } from '../../dtos/courses/public-course-filter.dto';
import { ICoursePagination } from '../../interfaces/ICoursePagination';
import { CourseRepository } from '../../repositories/course.repository';
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
    filter: PublicCourseFilter = {},
  ): Promise<ICoursePagination> {
    const { data, total } = await this.courseRepository.findPublic({
      keyword,
      page,
      limit,
      ...filter,
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: await this.GetCoursesWithRatingService.get(data),
    };
  }
}

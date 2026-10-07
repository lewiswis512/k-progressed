import { Injectable } from '@nestjs/common';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';
import { IAdminCoursePagination } from '../../interfaces/IAdminCoursePagination';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class AdminCoursesService {
  public constructor(private courseRepository: CourseRepository) {}

  async get(
    keyword: string,
    page: number,
    limit: number,
    status?: CourseStatusEnum,
  ): Promise<IAdminCoursePagination> {
    const { data, total } = await this.courseRepository.findForAdmin({
      keyword,
      status,
      page,
      limit,
    });

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }
}

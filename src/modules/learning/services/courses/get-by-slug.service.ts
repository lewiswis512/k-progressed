import { Injectable, NotFoundException } from '@nestjs/common';
import { IAccessUser } from '../../../../common/access/course-access.service';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CourseRepository } from '../../repositories/course.repository';
import { GetCourseByIdService } from './get-by-id.service';
import { GetCourseWithRatingService } from './get-one-with-rating.service';

@Injectable()
export class GetCoursesBySlugService {
  public constructor(
    private courseRepository: CourseRepository,
    private GetCourseWithRatingService: GetCourseWithRatingService,
    private getCourseByIdService: GetCourseByIdService,
  ) {}

  async findBy(
    slug: string,
    user?: IAccessUser,
  ): Promise<ICourseWithAverageRating> {
    const course = await this.courseRepository.findOneOrNull({ crs_slug: slug });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.getCourseByIdService.assertVisible(course, user);

    const populated = await this.courseRepository.findById(course._id, {
      populate: [
        {
          path: 'author',
          select: 'usr_username usr_firstname usr_lastname usr_slug usr_photo',
        },
        { path: 'category', select: '_id ctgr_name' },
        { path: 'teacher', select: '_id tchr_title tchr_biography' },
      ],
    });

    return this.GetCourseWithRatingService.get(populated);
  }
}

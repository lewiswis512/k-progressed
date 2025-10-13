import { Injectable, NotFoundException } from '@nestjs/common';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CourseRepository } from '../../repositories/course.repository';
import { GetCourseWithRatingService } from './get-one-with-rating.service';

@Injectable()
export class GetCoursesBySlugService {
  public constructor(
    private courseRepository: CourseRepository,
    private GetCourseWithRatingService: GetCourseWithRatingService,
  ) {}

  async findBy(slug: string): Promise<ICourseWithAverageRating> {
    const course = await this.courseRepository.findOne(
      { crs_slug: slug },
      {
        populate: {
          path: 'author',
          select: 'usr_username usr_firstname usr_lastname',
        },
      },
    );

    if (!course) {
      throw new NotFoundException(`Course not found`);
    }

    return this.GetCourseWithRatingService.get(course);
  }
}

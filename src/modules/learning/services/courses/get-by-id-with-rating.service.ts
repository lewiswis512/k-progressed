import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CourseRepository } from '../../repositories/course.repository';
import { GetCourseWithRatingService } from './get-one-with-rating.service';

@Injectable()
export class GetCourseByIdWithRatingService {
  public constructor(
    private courseRepository: CourseRepository,
    private GetCourseWithRatingService: GetCourseWithRatingService,
  ) {}

  async findByIdWithRating(id: string): Promise<ICourseWithAverageRating> {
    const course = await this.courseRepository.findById(
      new Types.ObjectId(id),
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

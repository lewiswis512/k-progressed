import { Injectable, NotFoundException } from '@nestjs/common';
import { ICourseWithAverageRating } from '../../../../interfaces/courses/ICourseWithAverageRating';
import { CourseRepository } from '../../repositories/course.repository';
import { GetCourseWithRatingService } from './get-with-rating.service';

@Injectable()
export class GetCoursesBySlugService {
  public constructor(
    private courseRepository: CourseRepository,
    private getCourseWithRatingService: GetCourseWithRatingService,
  ) {}

  async findBy(slug: string): Promise<ICourseWithAverageRating> {
    const [course] = await this.courseRepository.aggregate([
      { $project: { __v: 0 } },
      { $match: { crs_slug: slug } },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                _id: 0,
                usr_username: 1,
                usr_firstname: 1,
                usr_lastname: 1,
              },
            },
          ],
          as: 'author',
        },
      },
      { $unwind: '$author' },
    ]);

    if (!course) {
      throw new NotFoundException(`Course not found`);
    }

    return this.getCourseWithRatingService.get(course);
  }
}

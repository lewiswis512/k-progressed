import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';
import { CourseRepository } from '../../repositories/course.repository';
import { Course } from '../../schemas/course.schema';
import { GetCourseByIdService } from './get-by-id.service';

@Injectable()
export class UpdateCourseStatusService {
  public constructor(
    private getCourseByIdService: GetCourseByIdService,
    private courseRepository: CourseRepository,
  ) {}

  async update(id: string, status: CourseStatusEnum): Promise<Course> {
    await this.getCourseByIdService.byId(id);

    return this.courseRepository.findByIdAndUpdate(new Types.ObjectId(id), {
      crs_status: status,
      updated_at: new Date(),
    });
  }
}

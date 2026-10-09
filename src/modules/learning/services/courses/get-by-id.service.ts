import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../../common/access/course-access.service';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';
import { Course } from '../../schemas/course.schema';
import { CourseRepository } from '../../repositories/course.repository';

@Injectable()
export class GetCourseByIdService {
  public constructor(
    private courseRepository: CourseRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async byId(id: string): Promise<Course> {
    return this.courseRepository.findById(new Types.ObjectId(id));
  }

  assertVisible(course: Course, user?: IAccessUser): void {
    if (
      course.crs_status !== CourseStatusEnum.VALIDATED &&
      !this.courseAccessService.canManage(user, course)
    ) {
      throw new NotFoundException('Course not found');
    }
  }

  async visibleById(id: string, user?: IAccessUser): Promise<Course> {
    const course = await this.byId(id);

    this.assertVisible(course, user);

    return course;
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../../common/access/course-access.service';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';
import { LessonRepository } from '../../repositories/lesson.repository';
import { Lesson } from '../../schemas/lesson.schema';

@Injectable()
export class LessonService {
  constructor(
    private lessonRepository: LessonRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async byId(id: string): Promise<Lesson> {
    return await this.lessonRepository.findById(new Types.ObjectId(id), {
      populate: {
        path: 'section',
        select: '_id sect_title course',
        populate: {
          path: 'course',
          select: '_id author crs_status',
        },
      },
    });
  }

  async viewable(id: string, user: IAccessUser): Promise<Lesson> {
    const lesson = await this.byId(id);
    const course = lesson.section?.course;

    if (!course) {
      throw new ForbiddenException('This lesson is not available');
    }

    if (this.courseAccessService.canManage(user, course)) {
      return lesson;
    }

    if (course.crs_status !== CourseStatusEnum.VALIDATED) {
      throw new ForbiddenException('This lesson is not available');
    }

    if (!lesson.lssn_is_free) {
      await this.courseAccessService.assertAccess(user, course);
    }

    return lesson;
  }
}

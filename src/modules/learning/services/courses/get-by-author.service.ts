import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../../common/access/course-access.service';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';
import { CourseRepository } from '../../repositories/course.repository';
import { Course } from '../../schemas/course.schema';

@Injectable()
export class CoursesByAuthorService {
  public constructor(
    private courseRepository: CourseRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async byAuthor(authorId: string, user?: IAccessUser): Promise<Course[]> {
    const canSeeEverything = this.courseAccessService.canManage(user, {
      author: authorId,
    });

    return await this.courseRepository.find(
      {
        author: new Types.ObjectId(authorId),
        ...(canSeeEverything ? {} : { crs_status: CourseStatusEnum.VALIDATED }),
      },
      {
        populate: [
          {
            path: 'category',
            select: '_id ctgr_name',
          },
          {
            path: 'author',
            select: 'usr_username usr_firstname usr_lastname usr_slug',
          },
          {
            path: 'teacher',
            select: '_id tchr_title tchr_biography author',
          },
        ],
      },
    );
  }
}

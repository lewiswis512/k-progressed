import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { Course } from '../../schemas/course.schema';
import { Section } from '../../schemas/section.schema';
import { ICourseContents } from '../../../../interfaces/courses/ICourseContents';
import { GetCourseByIdService } from './get-by-id.service';
import {
  getMinuteAndSecond,
  getSecond,
} from '../../../../utils/times/duration';
import { SectionRepository } from '../../repositories/section.repository';
import { CourseSectionsService } from './get-sections.service';
import { CourseContentDetailService } from './get-content-detail.service';

@Injectable()
export class CourseContentService {
  public constructor(
    private sectionRepository: SectionRepository,
    private getCourseByIdService: GetCourseByIdService,
    private courseSectionsService: CourseSectionsService,
    private courseContentDetailService: CourseContentDetailService,
  ) {}

  async get(
    courseId: string,
    isFree: boolean,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course: Course = await this.getCourseByIdService.byId(courseId);
    let courseContents: ICourseContents[] = [];
    const sections: Section[] = await this.courseSectionsService.get(
      course._id,
      course.teacher.author,
    );

    const totalSections: number = sections.length;
    let totalLessons: number = 0;
    let totalDuration: number = 0;

    for (const section of sections) {
      const sectionDoc: Section = await this.sectionRepository.findById(
        new Types.ObjectId(section._id),
      );

      const courseContentInfo = await this.courseContentDetailService.get(
        isFree,
        totalLessons,
        totalDuration,
        courseContents,
        sectionDoc,
      );

      totalLessons = courseContentInfo.totalLessons;
      totalDuration = courseContentInfo.totalDuration;
      courseContents = courseContentInfo.courseContents;
    }

    return {
      courseContents,
      totalSections,
      totalLessons,
      totalDuration:
        totalDuration !== 0 && totalDuration >= 60
          ? getMinuteAndSecond(totalDuration)
          : getSecond(totalDuration),
    };
  }
}

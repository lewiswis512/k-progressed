import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ICourseContents } from '../../../../interfaces/courses/ICourseContents';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { SectionRepository } from '../../repositories/section.repository';
import { SectionLessonsWithDurationService } from '../lessons/section-with-duration.service';
import { SectionLessonsService } from '../lessons/section.service';
import { GetCourseByIdService } from './get-by-id.service';
import { CourseSectionsService } from './get-sections.service';

@Injectable()
export class CourseContentService {
  constructor(
    private readonly sectionRepository: SectionRepository,
    private readonly getCourseByIdService: GetCourseByIdService,
    private readonly courseSectionsService: CourseSectionsService,
    private readonly sectionLessonsService: SectionLessonsService,
    private readonly sectionLessonsWithDurationService: SectionLessonsWithDurationService,
  ) {}

  async get(
    courseId: string,
    isFree: boolean,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course = await this.getCourseByIdService.byId(courseId);

    const sections = await this.courseSectionsService.get(
      course._id,
      course.teacher.author,
    );

    const totalSections = sections.length;
    let totalLessons = 0;
    let totalDurationSeconds = 0;

    const courseContents: ICourseContents[] = [];

    for (const section of sections) {
      const sectionDoc = await this.sectionRepository.findById(
        new Types.ObjectId(section._id),
      );

      const lessonsInSection = await this.sectionLessonsService.get(sectionDoc);
      totalLessons += lessonsInSection.length;

      const lessonsWithDuration =
        await this.sectionLessonsWithDurationService.get(
          lessonsInSection,
          isFree,
        );

      const sectionDurationSeconds = this.calculateTotalSeconds(
        lessonsWithDuration.map((l) => l.lssn_duration_in_min_sec),
      );

      totalDurationSeconds += sectionDurationSeconds;

      courseContents.push({
        section: sectionDoc,
        lessons: lessonsWithDuration,
        countLesson: lessonsInSection.length,
        countDurationInMinute: this.formatDuration(sectionDurationSeconds),
      });
    }

    return {
      courseContents,
      totalSections,
      totalLessons,
      totalDuration: this.formatDuration(totalDurationSeconds),
    };
  }

  private calculateTotalSeconds(durations: (string | number)[]): number {
    return durations.reduce<number>((total, time) => {
      if (typeof time === 'number') {
        return total + Math.round(time);
      }

      const str = time.trim();

      if (str.includes(':')) {
        const parts = str
          .split(':')
          .map(Number)
          .map((v) => (isNaN(v) ? 0 : v));

        let hours = 0,
          minutes = 0,
          seconds = 0;

        if (parts.length === 3) {
          [hours, minutes, seconds] = parts;
        } else if (parts.length === 2) {
          [minutes, seconds] = parts;
        } else if (parts.length === 1) {
          [seconds] = parts;
        }

        return total + hours * 3600 + minutes * 60 + seconds;
      }

      const seconds = Number(str);

      return total + (isNaN(seconds) ? 0 : Math.round(seconds));
    }, 0);
  }

  private formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    } else if (minutes > 0) {
      return `${minutes}:${seconds}`;
    } else {
      return `${seconds}s`;
    }
  }
}

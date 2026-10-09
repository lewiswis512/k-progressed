import { Injectable } from '@nestjs/common';
import { ICourseContents } from '../../../../interfaces/courses/ICourseContents';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { LessonRepository } from '../../repositories/lesson.repository';
import { SectionRepository } from '../../repositories/section.repository';
import { Lesson } from '../../schemas/lesson.schema';
import { GetCourseByIdService } from './get-by-id.service';

@Injectable()
export class CourseContentService {
  constructor(
    private readonly sectionRepository: SectionRepository,
    private readonly getCourseByIdService: GetCourseByIdService,
    private lessonRepository: LessonRepository,
  ) {}

  async get(
    courseId: string,
    includeVideoLinks: boolean,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course = await this.getCourseByIdService.byId(courseId);
    const sections = await this.sectionRepository.find({ course: course._id });
    const lessons = await this.lessonRepository.findInCourseOrder({
      section: { $in: sections.map((section) => section._id) },
    });

    let totalDurationSeconds = 0;

    const courseContents: ICourseContents[] = sections.map((section) => {
      const lessonsInSection = lessons.filter(
        (lesson) => String(lesson.section) === String(section._id),
      );
      const lessonsWithDuration = this.mapLessons(
        lessonsInSection,
        includeVideoLinks,
      );
      const sectionDurationSeconds = this.calculateTotalSeconds(
        lessonsWithDuration.map((l) => l.lssn_duration_in_min_sec),
      );

      totalDurationSeconds += sectionDurationSeconds;

      return {
        section,
        lessons: lessonsWithDuration,
        countLesson: lessonsInSection.length,
        countDurationInMinute: this.formatDuration(sectionDurationSeconds),
      };
    });

    return {
      courseContents,
      totalSections: sections.length,
      totalLessons: lessons.length,
      totalDuration: this.formatDuration(totalDurationSeconds),
    };
  }

  private mapLessons(lessons: Lesson[], includeVideoLinks: boolean) {
    return lessons.map((lesson) => ({
      _id: lesson._id,
      lssn_title: lesson.lssn_title,
      lssn_is_free: lesson.lssn_is_free,
      lssn_video_link:
        includeVideoLinks || lesson.lssn_is_free ? lesson.lssn_video_link : '',
      lssn_duration_in_min_sec: lesson.lssn_duration,
    }));
  }

  private calculateTotalSeconds(durations: (string | number)[]): number {
    return durations.reduce<number>((total, time) => {
      if (time === null || time === undefined) {
        return total;
      }

      if (typeof time === 'number') {
        return total + Math.round(time);
      }

      const str = time.trim();

      if (str.includes(':')) {
        const parts = str
          .split(':')
          .map(Number)
          .map((v) => {
            if (isNaN(v)) {
              return 0;
            } else {
              return v;
            }
          });

        let hours = 0;
        let minutes = 0;
        let seconds = 0;

        if (parts.length === 3) {
          hours = parts[0];
          minutes = parts[1];
          seconds = parts[2];
        } else if (parts.length === 2) {
          minutes = parts[0];
          seconds = parts[1];
        } else if (parts.length === 1) {
          seconds = parts[0];
        }

        return total + hours * 3600 + minutes * 60 + seconds;
      }

      const seconds = Number(str);
      if (isNaN(seconds)) {
        return total;
      } else {
        return total + Math.round(seconds);
      }
    }, 0);
  }

  private formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) return `${hours} h ${minutes} min`;
    if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')}`;

    return `${seconds}s`;
  }
}

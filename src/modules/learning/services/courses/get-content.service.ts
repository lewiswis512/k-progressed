import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ICourseContents } from '../../../../interfaces/courses/ICourseContents';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { SectionRepository } from '../../repositories/section.repository';
import { SectionLessonsService } from '../lessons/section.service';
import { GetCourseByIdService } from './get-by-id.service';

@Injectable()
export class CourseContentService {
  constructor(
    private readonly sectionRepository: SectionRepository,
    private readonly getCourseByIdService: GetCourseByIdService,
    private readonly sectionLessonsService: SectionLessonsService,
  ) {}

  async get(
    courseId: string,
    isFree: boolean,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course = await this.getCourseByIdService.byId(courseId);
    const sections = await this.getCourseSections(course);

    let totalLessons = 0;
    let totalDurationSeconds = 0;

    const sectionsWithLessons = await Promise.all(
      sections.map(async (section) => {
        const lessonsInSection = await this.getLessonsForSection(section);
        const lessonsWithDuration = this.mapLessons(lessonsInSection, isFree);

        const sectionDurationSeconds = this.calculateTotalSeconds(
          lessonsWithDuration.map((l) => l.lssn_duration_in_min_sec),
        );

        return {
          section,
          lessons: lessonsWithDuration,
          countLesson: lessonsInSection.length,
          countDurationInMinute: this.formatDuration(sectionDurationSeconds),
          sectionDurationSeconds,
        };
      }),
    );

    sectionsWithLessons.forEach((s) => {
      totalLessons += s.countLesson;
      totalDurationSeconds += s.sectionDurationSeconds;
    });

    const courseContents: ICourseContents[] = sectionsWithLessons.map(
      ({ section, lessons, countLesson, countDurationInMinute }) => ({
        section,
        lessons,
        countLesson,
        countDurationInMinute,
      }),
    );

    return {
      courseContents,
      totalSections: sections.length,
      totalLessons,
      totalDuration: this.formatDuration(totalDurationSeconds),
    };
  }

  private async getCourseSections(course: any) {
    return this.sectionRepository.find({
      course: {
        _id: course._id,
        author: course.teacher.author,
      },
    });
  }

  private async getLessonsForSection(section: any) {
    const sectionDoc = await this.sectionRepository.findById(
      new Types.ObjectId(String(section._id)),
    );

    return this.sectionLessonsService.get(sectionDoc);
  }

  private mapLessons(lessons: any[], isFree: boolean) {
    return lessons.map((lesson) => ({
      _id: lesson._id,
      lssn_title: lesson.lssn_title,
      lssn_is_free: lesson.lssn_is_free,
      lssn_video_link: isFree ? lesson.lssn_video_link : '',
      lssn_duration_in_min_sec: lesson.lssn_duration,
    }));
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
    if (minutes > 0) return `${minutes}:${seconds}`;

    return `${seconds}s`;
  }
}

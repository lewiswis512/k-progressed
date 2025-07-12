import { Injectable } from '@nestjs/common';
import { ICourseContents } from '../../../../interfaces/courses/ICourseContents';
import { Section } from '../../schemas/section.schema';
import { Lesson } from '../../schemas/lesson.schema';
import {
  getMinuteAndSecond,
  getSecond,
} from '../../../../utils/times/duration';
import { SectionLessonsService } from '../lessons/section.service';
import { SectionLessonsWithDurationService } from '../lessons/section-with-duration.service';

@Injectable()
export class CourseContentDetailService {
  public constructor(
    private sectionLessonsService: SectionLessonsService,
    private sectionLessonsWithDurationService: SectionLessonsWithDurationService,
  ) {}

  public async get(
    isFree: boolean,
    totalLessons: number,
    totalDuration: number,
    courseContents: ICourseContents[],
    section: Section,
  ): Promise<{
    totalLessons: number;
    totalDuration: number;
    courseContents: ICourseContents[];
  }> {
    let lessonsInSection: Lesson[] =
      await this.sectionLessonsService.get(section);
    totalLessons += lessonsInSection.length;

    const lessonsInSectionWithDuration =
      await this.sectionLessonsWithDurationService.get(
        0,
        lessonsInSection,
        isFree,
      );

    const totalDurationLessonBySection = lessonsInSectionWithDuration.reduce(
      (acc, lesson) => {
        const timeStr = lesson.lssn_duration_in_min_sec.toString();
        const parts = timeStr.split(':').map(Number);
        const seconds =
          parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0];
        return acc + seconds;
      },
      0,
    );

    totalDuration += totalDurationLessonBySection;

    courseContents.push({
      section,
      lessons: lessonsInSectionWithDuration,
      countLesson: lessonsInSection.length,
      countDurationInMinute:
        totalDurationLessonBySection >= 60
          ? getMinuteAndSecond(totalDurationLessonBySection)
          : getSecond(totalDurationLessonBySection),
    });

    return {
      totalLessons,
      totalDuration,
      courseContents,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { ILessonInSectionWithDuration } from '../../../../interfaces/lessons/ILessonInSectionWithDuration';
import { Lesson } from '../../schemas/lesson.schema';

@Injectable()
export class SectionLessonsWithDurationService {
  public async get(
    lessonsInSection: Lesson[],
    isFree: boolean,
  ): Promise<ILessonInSectionWithDuration[]> {
    return await Promise.all(
      [...lessonsInSection].map(async (lesson) => {
        return {
          _id: lesson._id,
          lssn_title: lesson.lssn_title,
          lssn_is_free: lesson.lssn_is_free,
          lssn_video_link: isFree === false ? '' : lesson.lssn_video_link,
          lssn_duration_in_min_sec: lesson.lssn_duration,
        };
      }),
    );
  }
}

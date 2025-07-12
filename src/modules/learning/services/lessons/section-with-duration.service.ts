import { Injectable } from '@nestjs/common';
import { Lesson } from '../../schemas/lesson.schema';
import { ILessonInSectionWithDuration } from '../../../../interfaces/lessons/ILessonInSectionWithDuration';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../../utils/times/duration';
import { PATH_UPLOAD_LESSON_VIDEOS } from '../../../../utils/constants/uploads/path-upload';

@Injectable()
export class SectionLessonsWithDurationService {
  public async get(
    totalDurationLessonBySection: number,
    lessonsInSection: Lesson[],
    isFree: boolean,
  ): Promise<ILessonInSectionWithDuration[]> {
    return await Promise.all(
      [...lessonsInSection].map(async (lesson) => {
        let duration = 0;

        if (
          lesson.lssn_video_link.startsWith('https') ||
          lesson.lssn_video_link.startsWith('http')
        ) {
          totalDurationLessonBySection = await getVideoDuration(
            lesson.lssn_video_link,
          );
        } else {
          totalDurationLessonBySection = await getVideoDuration(
            `${PATH_UPLOAD_LESSON_VIDEOS}/${lesson.lssn_video_link}`,
          );
        }

        totalDurationLessonBySection += duration;

        return {
          _id: lesson._id,
          lssn_title: lesson.lssn_title,
          lssn_is_free: lesson.lssn_is_free,
          lssn_video_link: isFree === false ? '' : lesson.lssn_video_link,
          lssn_duration_in_min_sec:
            totalDurationLessonBySection !== 0 &&
            totalDurationLessonBySection >= 60
              ? getMinuteAndSecond(totalDurationLessonBySection)
              : getSecond(totalDurationLessonBySection),
        };
      }),
    );
  }
}

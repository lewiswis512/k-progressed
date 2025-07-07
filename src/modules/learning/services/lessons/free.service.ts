import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Section } from '../../schemas/section.schema';
import { SectionRepository } from '../../repositories/section.repository';
import { LessonRepository } from '../../repositories/lesson.repository';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../../utils/times/duration';
import { videoLink } from '../../../../utils/uploads/video-link';

export interface IFreeLesson {
  _id: Types.ObjectId;
  lssn_title: string;
  lssn_video_link?: string;
  lssn_video_photo?: string;
  lssn_is_free: boolean;
  section: Section;
  duration: string | number | null;
}

@Injectable()
export class FreeLessonService {
  constructor(
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
  ) {}

  async getByCourseId(courseId: string): Promise<IFreeLesson[]> {
    const sections: Section[] = await this.sectionRepository.find({
      course: courseId,
    });

    let freeLessons: IFreeLesson[] = [];

    for (const section of sections) {
      let lessons = await this.lessonRepository.find({
        section,
        lssn_is_free: true,
      });

      for (const lesson of lessons) {
        const durationInSeconds = await getVideoDuration(
          videoLink(lesson.lssn_video_link),
        );
        const formattedDuration =
          durationInSeconds != 0 && durationInSeconds >= 60
            ? getMinuteAndSecond(durationInSeconds)
            : getSecond(durationInSeconds);
        freeLessons.push({
          _id: lesson._id,
          lssn_title: lesson.lssn_title,
          lssn_video_link: lesson.lssn_video_link,
          lssn_video_photo: lesson.lssn_video_photo,
          lssn_is_free: lesson.lssn_is_free,
          section: lesson.section,
          duration: formattedDuration,
        });
      }
    }

    return freeLessons;
  }
}

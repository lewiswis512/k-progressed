import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../../common/access/course-access.service';
import { AddLesson } from '../../dtos/lessons/add-lesson.dto';
import { PATH_LESSONS_CLOUDINARY } from '../../../../utils/constants/uploads/path-upload';
import { SectionRepository } from '../../repositories/section.repository';
import { LessonRepository } from '../../repositories/lesson.repository';
import { formatLessonDuration } from '../../../../utils/times/duration';
import { VideoUploadStrategy } from '../../../../utils/uploads/video-upload-strategy';
import { CloudinaryVideoUploadStrategy } from '../../../../utils/uploads/cloudinary-video-upload-strategy';
import { Lesson } from '../../schemas/lesson.schema';

@Injectable()
export class AddLessonService {
  constructor(
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async store(
    addLesson: AddLesson,
    file: Express.Multer.File,
    user: IAccessUser,
  ): Promise<Lesson> {
    const section = await this.sectionRepository.findById(
      new Types.ObjectId(addLesson.section_id),
      { populate: { path: 'course', select: '_id author' } },
    );

    this.courseAccessService.assertCanManage(user, section.course);

    const video = await new VideoUploadStrategy(
      new CloudinaryVideoUploadStrategy(),
    ).upload(file, PATH_LESSONS_CLOUDINARY);

    return await this.lessonRepository.create({
      lssn_title: addLesson.lssn_title,
      lssn_is_free: addLesson.lssn_is_free,
      section,
      lssn_video_link: video.path,
      lssn_video_photo: video.thumbnail,
      lssn_duration: formatLessonDuration(video.duration),
    });
  }
}

import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AddLesson } from '../../dtos/lessons/add-lesson.dto';
import {
  PATH_LESSON_PHOTOS_CLOUDINARY,
  PATH_UPLOAD_LESSON_VIDEOS,
} from '../../../../utils/constants/uploads/path-upload';
import { videoLink } from '../../../../utils/uploads/video-link';
import { SectionRepository } from '../../repositories/section.repository';
import { LessonRepository } from '../../repositories/lesson.repository';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../../utils/times/duration';
import { VideoUploadStrategy } from '../../../../utils/uploads/video-upload-strategy';
import { CloudinaryVideoUploadStrategy } from '../../../../utils/uploads/cloudinary-video-upload-strategy';
import { ScreenShot } from '../../../../utils/uploads/take-screen-shot';

@Injectable()
export class AddLessonService {
  constructor(
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
  ) {}

  async store(addLesson: AddLesson, file: Express.Multer.File): Promise<any> {
    const videoUploadStrategy = new VideoUploadStrategy(
      new CloudinaryVideoUploadStrategy(),
    );

    let { path: videoPath } = await videoUploadStrategy.upload(
      file,
      PATH_UPLOAD_LESSON_VIDEOS,
    );

    const lessonPhotoFilename: string = await new ScreenShot().takeFrom(
      videoLink(videoPath),
      PATH_LESSON_PHOTOS_CLOUDINARY,
    );

    const section = await this.sectionRepository.findById(
      new Types.ObjectId(addLesson.section_id),
    );

    let videoDuration = 0;

    if (videoPath.startsWith('https') || videoPath.startsWith('http')) {
      videoDuration = await getVideoDuration(videoPath);
    } else {
      videoDuration = await getVideoDuration(
        `${PATH_UPLOAD_LESSON_VIDEOS}/${videoPath}`,
      );
    }

    let data = {
      ...addLesson,
      section,
      lssn_video_link: videoPath,
      lssn_video_photo: lessonPhotoFilename,
      lssn_duration:
        videoDuration !== 0 && videoDuration >= 60
          ? getMinuteAndSecond(videoDuration)
          : (getSecond(videoDuration) as string),
    };

    return await this.lessonRepository.create(data);
  }
}

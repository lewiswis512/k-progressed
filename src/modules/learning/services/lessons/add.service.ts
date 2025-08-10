import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AddLesson } from '../../dtos/lessons/add-lesson.dto';
import { Lesson } from '../../schemas/lesson.schema';
import { videoUploaderProvider } from '../../../../utils/uploads/video-uploader-provider';
import {
  PATH_LESSON_PHOTOS_CLOUDINARY,
  PATH_UPLOAD_LESSON_VIDEOS,
} from '../../../../utils/constants/uploads/path-upload';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { videoLink } from '../../../../utils/uploads/video-link';
import { SectionRepository } from '../../repositories/section.repository';
import { LessonRepository } from '../../repositories/lesson.repository';
import {
  getMinuteAndSecond,
  getSecond,
  getVideoDuration,
} from '../../../../utils/times/duration';

@Injectable()
export class AddLessonService {
  constructor(
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
  ) {}

  async store(addLesson: AddLesson, file: Express.Multer.File): Promise<any> {
    let { secure_url: videoPath } = await videoUploaderProvider.uploadVideo(
      file,
      PATH_UPLOAD_LESSON_VIDEOS,
    );
    const lessonPhotoFilename: string =
      await this.cloudinaryUploadStrategy.takeScreenshot(
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

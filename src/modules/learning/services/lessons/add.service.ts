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

@Injectable()
export class AddLessonService {
  constructor(
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
  ) {}

  async store(
    addLesson: AddLesson,
    file: Express.Multer.File,
  ): Promise<Lesson> {
    let { secure_url: videoPath } = await videoUploaderProvider.uploadVideo(
      file.buffer,
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

    let data = {
      ...addLesson,
      section,
      lssn_video_link: videoPath,
      lssn_video_photo: lessonPhotoFilename,
    };

    return await this.lessonRepository.create(data);
  }
}

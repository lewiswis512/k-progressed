import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { EditLesson } from '../../dtos/lessons/edit-lesson.dto';
import { Lesson } from '../../schemas/lesson.schema';
import { AuthorLessonService } from './author.service';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { videoUploaderProvider } from '../../../../utils/uploads/video-uploader-provider';
import {
  PATH_LESSON_PHOTOS_CLOUDINARY,
  PATH_UPLOAD_LESSON_VIDEOS,
} from '../../../../utils/constants/uploads/path-upload';
import { LessonRepository } from '../../repositories/lesson.repository';
import { DeleteLessonService } from './delete.service';
import { videoLink } from '../../../../utils/uploads/video-link';
import { LessonService } from './find-one-by-id.service';

@Injectable()
export class UpdateLessonservice {
  constructor(
    private lessonService: LessonService,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private lessonRepository: LessonRepository,
    private deleteLessonService: DeleteLessonService,
  ) {}

  async update(
    id: string,
    editLesson: EditLesson,
    file: Express.Multer.File,
    authorId: string,
  ): Promise<Lesson> {
    const lesson: Lesson = await this.lessonService.byId(id);

    AuthorLessonService.isAuthor(
      lesson.section.course.author._id.toString(),
      authorId,
    );

    let lessonPhotoFilename: string;
    let videoPath: string;

    if (file === undefined) {
      lessonPhotoFilename = lesson.lssn_video_photo;
      videoPath = lesson.lssn_video_link;
    } else {
      await this.deleteLessonService.deleteVideoLesson(lesson);
      await this.deleteLessonService.deleteLessonPhoto(lesson);

      let { secure_url: videoPath } = await videoUploaderProvider.uploadVideo(
        file.buffer,
        PATH_UPLOAD_LESSON_VIDEOS,
      );

      lessonPhotoFilename = await this.cloudinaryUploadStrategy.takeScreenshot(
        videoLink(videoPath),
        PATH_LESSON_PHOTOS_CLOUDINARY,
      );
    }

    let data = {
      ...editLesson,
      lssn_video_photo: lessonPhotoFilename,
      lssn_video_link: videoPath,
    };

    return await this.lessonRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }
}

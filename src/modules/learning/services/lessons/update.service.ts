import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CloudinaryVideoUploadStrategy } from 'src/utils/uploads/cloudinary-video-upload-strategy';
import { ScreenShot } from 'src/utils/uploads/take-screen-shot';
import { VideoUploadStrategy } from 'src/utils/uploads/video-upload-strategy';
import {
  PATH_LESSON_PHOTOS_CLOUDINARY,
  PATH_UPLOAD_LESSON_VIDEOS,
} from '../../../../utils/constants/uploads/path-upload';
import { videoLink } from '../../../../utils/uploads/video-link';
import { EditLesson } from '../../dtos/lessons/edit-lesson.dto';
import { LessonRepository } from '../../repositories/lesson.repository';
import { Lesson } from '../../schemas/lesson.schema';
import { AuthorLessonService } from './author.service';
import { DeleteLessonService } from './delete.service';
import { LessonService } from './find-one-by-id.service';

@Injectable()
export class UpdateLessonservice {
  constructor(
    private lessonService: LessonService,
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

      const videoUploadStrategy = new VideoUploadStrategy(
        new CloudinaryVideoUploadStrategy(),
      );

      let { path: videoPath } = await videoUploadStrategy.upload(
        file,
        PATH_UPLOAD_LESSON_VIDEOS,
      );

      lessonPhotoFilename = await new ScreenShot().takeFrom(
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

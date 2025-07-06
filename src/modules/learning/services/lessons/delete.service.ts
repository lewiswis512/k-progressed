import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import * as fs from 'fs';
import { Lesson } from '../../schemas/lesson.schema';
import { LessonsService } from '../lessons.service';
import { AuthorLessonService } from './author.service';
import { LessonRepository } from '../../repositories/lesson.repository';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { PATH_UPLOAD_LESSON_VIDEOS } from 'src/utils/constants/uploads/path-upload';

@Injectable()
export class DeleteLessonService {
  constructor(
    private lessonService: LessonsService,
    private lessonRepository: LessonRepository,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
  ) {}

  async delete(id: string, authorId: string): Promise<void> {
    const lesson: Lesson = await this.lessonService.findById(id);

    AuthorLessonService.isAuthor(
      lesson.section.course.author._id.toString(),
      authorId,
    );
    this.deleteVideoLesson(lesson);
    this.deleteLessonPhoto(lesson);

    await this.lessonRepository.findByIdAndDelete(new Types.ObjectId(id));
  }

  async deleteVideoLesson(lesson: Lesson): Promise<void> {
    if (
      lesson.lssn_video_link.startsWith('https') ||
      lesson.lssn_video_link.startsWith('http')
    ) {
      const publicId = this.cloudinaryUploadStrategy.getPublicIdFromUrl(
        lesson.lssn_video_link,
      );

      await this.cloudinaryUploadStrategy.delete(publicId);
    } else {
      const videoPath = `${PATH_UPLOAD_LESSON_VIDEOS}/${lesson.lssn_video_link}`;
      fs.unlink(videoPath, (err) => {
        if (err) {
          console.error('Failed to delete video:', err);
          return;
        }
      });
    }
  }

  async deleteLessonPhoto(lesson: Lesson): Promise<void> {
    if (lesson.lssn_video_photo) {
      const publicId = this.cloudinaryUploadStrategy.getPublicIdFromUrl(
        lesson.lssn_video_photo,
      );

      await this.cloudinaryUploadStrategy.delete(publicId);
    }
  }
}

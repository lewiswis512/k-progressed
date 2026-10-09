import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { IAccessUser } from '../../../../common/access/course-access.service';
import { Lesson } from '../../schemas/lesson.schema';
import { AuthorLessonService } from './author.service';
import { LessonRepository } from '../../repositories/lesson.repository';
import { deleteLessonMedia } from '../../../../utils/uploads/delete-lesson-media';
import { LessonService } from './find-one-by-id.service';
import { errorStack } from '../../../../utils/errors';

@Injectable()
export class DeleteLessonService {
  private readonly logger = new Logger(DeleteLessonService.name);

  constructor(
    private lessonService: LessonService,
    private lessonRepository: LessonRepository,
  ) {}

  async delete(id: string, user: IAccessUser): Promise<void> {
    const lesson: Lesson = await this.lessonService.byId(id);

    const course = lesson.section.course;

    AuthorLessonService.isAuthor(String(course.author._id), user);

    await this.deleteMedia(lesson);
    await this.lessonRepository.findByIdAndDelete(new Types.ObjectId(id));
  }

  async deleteMedia(
    lesson: Pick<Lesson, 'lssn_video_link' | 'lssn_video_photo'>,
  ): Promise<void> {
    try {
      await deleteLessonMedia(lesson);
    } catch (error: unknown) {
      this.logger.error('Failed to delete the lesson media', errorStack(error));
    }
  }
}

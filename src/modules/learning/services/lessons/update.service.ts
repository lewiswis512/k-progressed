import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { IAccessUser } from '../../../../common/access/course-access.service';
import { CloudinaryVideoUploadStrategy } from '../../../../utils/uploads/cloudinary-video-upload-strategy';
import { VideoUploadStrategy } from '../../../../utils/uploads/video-upload-strategy';
import { PATH_LESSONS_CLOUDINARY } from '../../../../utils/constants/uploads/path-upload';
import { formatLessonDuration } from '../../../../utils/times/duration';
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
    user: IAccessUser,
  ): Promise<Lesson> {
    const lesson: Lesson = await this.lessonService.byId(id);

    const course = lesson.section.course;

    AuthorLessonService.isAuthor(String(course.author._id), user);

    const data: Partial<Lesson> = {
      lssn_title: editLesson.lssn_title,
      lssn_is_free: editLesson.lssn_is_free,
      updated_at: new Date(),
    };

    if (file !== undefined) {
      const video = await new VideoUploadStrategy(
        new CloudinaryVideoUploadStrategy(),
      ).upload(file, PATH_LESSONS_CLOUDINARY);

      await this.deleteLessonService.deleteMedia(lesson);

      data.lssn_video_link = video.path;
      data.lssn_video_photo = video.thumbnail;
      data.lssn_duration = formatLessonDuration(video.duration);
    }

    return await this.lessonRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      data,
    );
  }
}

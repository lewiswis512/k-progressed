import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Course } from '../../schemas/course.schema';
import { GetCourseByIdService } from './get-by-id.service';
import { IsCourseAuthorService } from './is-author.service';
import { CloudinaryUploadStrategy } from '../../../../utils/uploads/cloudinary-upload-strategy';
import { Section } from '../../schemas/section.schema';
import { Lesson } from '../../schemas/lesson.schema';
import { CourseRepository } from '../../repositories/course.repository';
import { SectionRepository } from '../../repositories/section.repository';
import { LessonRepository } from '../../repositories/lesson.repository';

@Injectable()
export class DeleteCourseService {
  public constructor(
    private getCourseByIdService: GetCourseByIdService,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private courseRepository: CourseRepository,
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
  ) {}

  async delete(id: string, authorId: string): Promise<void> {
    const course: Course = await this.getCourseByIdService.byId(id);

    IsCourseAuthorService.check(course.author._id.toString(), authorId);

    if (course.crs_photo) {
      const publicId = this.cloudinaryUploadStrategy.getPublicIdFromUrl(
        course.crs_photo,
      );

      await this.cloudinaryUploadStrategy.delete(publicId);
    }

    const sections: Section[] = await this.sectionRepository.find({
      'course._id': new Types.ObjectId(id),
    });

    for (const section of sections) {
      const lessons: Lesson[] = await this.lessonRepository.find({
        'section._id': new Types.ObjectId(section._id),
      });

      if (lessons.length > 0) {
        this.lessonRepository.deleteMany(lessons);
      }
    }

    this.sectionRepository.deleteMany({ 'course._id': id });

    this.courseRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}

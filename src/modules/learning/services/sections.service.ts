import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import {
  CourseAccessService,
  IAccessUser,
} from '../../../common/access/course-access.service';
import { CourseRepository } from '../../../modules/learning/repositories/course.repository';
import { deleteLessonMedia } from '../../../utils/uploads/delete-lesson-media';
import { AddSection } from '../dtos/sections/add-section.dto';
import { EditSection } from '../dtos/sections/edit-section.dto';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Lesson } from '../schemas/lesson.schema';
import { Section } from '../schemas/section.schema';

@Injectable()
export class SectionsService {
  private readonly logger = new Logger(SectionsService.name);

  constructor(
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private courseRepository: CourseRepository,
    private courseAccessService: CourseAccessService,
  ) {}

  async findAll(): Promise<Section[]> {
    return this.sectionRepository.find();
  }

  async findById(id: string): Promise<Section> {
    return await this.sectionRepository.findById(new Types.ObjectId(id));
  }

  async findByCourse(id: string): Promise<Section[]> {
    return await this.sectionRepository.find(
      {
        course: new Types.ObjectId(id),
      },
      {
        select: '_id sect_title sect_order created_at updated_at',
        populate: {
          path: 'course',
          select: '_id crs_title category',
          populate: {
            path: 'category',
            select: '_id ctgr_name',
          },
        },
      },
    );
  }

  async assertSectionManager(
    sectionId: string,
    user: IAccessUser,
  ): Promise<Section> {
    const section = await this.sectionRepository.findById(
      new Types.ObjectId(sectionId),
      { populate: { path: 'course', select: '_id author' } },
    );

    this.courseAccessService.assertCanManage(user, section.course);

    return section;
  }

  async getLessons(id: string, user: IAccessUser): Promise<Lesson[]> {
    await this.assertSectionManager(id, user);

    return this.lessonRepository.find({
      section: new Types.ObjectId(id),
    });
  }

  async store(addSectionDto: AddSection, user: IAccessUser): Promise<Section> {
    const course = await this.courseRepository.findById(
      new Types.ObjectId(addSectionDto.course_id),
    );

    this.courseAccessService.assertCanManage(user, course);

    return await this.sectionRepository.create({
      sect_title: addSectionDto.sect_title,
      sect_order: await this.sectionRepository.nextOrder(course._id),
      course,
    });
  }

  async update(
    id: string,
    editSectionDto: EditSection,
    user: IAccessUser,
  ): Promise<Section> {
    await this.assertSectionManager(id, user);

    return this.sectionRepository.findByIdAndUpdate(new Types.ObjectId(id), {
      sect_title: editSectionDto.sect_title,
      updated_at: new Date(),
    });
  }

  async reorder(
    courseId: string,
    ids: string[],
    user: IAccessUser,
  ): Promise<Section[]> {
    const course = await this.courseRepository.findById(
      new Types.ObjectId(courseId),
    );

    this.courseAccessService.assertCanManage(user, course);

    const sections = await this.sectionRepository.find({ course: course._id });
    const courseSectionIds = sections.map((section) => section._id.toString());
    const isSameSet =
      ids.length === courseSectionIds.length &&
      new Set(ids).size === ids.length &&
      ids.every((id) => courseSectionIds.includes(id));

    if (!isSameSet) {
      throw new BadRequestException(
        'Ids must contain every section of the course exactly once',
      );
    }

    await this.sectionRepository.reorder(course._id, ids);

    return this.findByCourse(courseId);
  }

  async deleteWithLessons(sectionIds: Types.ObjectId[]): Promise<void> {
    if (sectionIds.length === 0) {
      return;
    }

    const lessons: Lesson[] = await this.lessonRepository.find({
      section: { $in: sectionIds },
    });

    await Promise.all(
      lessons.map((lesson) =>
        deleteLessonMedia(lesson).catch((error) =>
          this.logger.error('Failed to delete the lesson media', error?.stack),
        ),
      ),
    );

    await this.lessonRepository.deleteMany({ section: { $in: sectionIds } });
    await this.sectionRepository.deleteMany({ _id: { $in: sectionIds } });
  }

  async delete(id: string, user: IAccessUser): Promise<void> {
    const section = await this.assertSectionManager(id, user);

    await this.deleteWithLessons([section._id]);
  }
}

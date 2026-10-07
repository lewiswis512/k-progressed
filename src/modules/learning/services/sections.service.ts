import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CourseRepository } from '../../../modules/learning/repositories/course.repository';
import { AddSection } from '../dtos/sections/add-section.dto';
import { EditSection } from '../dtos/sections/edit-section.dto';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Lesson } from '../schemas/lesson.schema';
import { Section } from '../schemas/section.schema';

@Injectable()
export class SectionsService {
  constructor(
    private sectionRepository: SectionRepository,
    private lessonRepository: LessonRepository,
    private courseRepository: CourseRepository,
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

  async getLessons(id: string): Promise<Lesson[]> {
    await this.findById(id);

    const lessons = await this.lessonRepository.find({
      section: id,
    });

    return lessons;
  }

  async store(addSectionDto: AddSection): Promise<Section> {
    const course = await this.courseRepository.findById(
      new Types.ObjectId(String(addSectionDto.course_id)),
    );

    let data: Partial<Section> = {
      sect_title: addSectionDto.sect_title,
      sect_order: await this.sectionRepository.nextOrder(course._id),
      course,
    };

    return await this.sectionRepository.create(data);
  }

  async isSectionAuthor(sectionId: string, authorId: string) {
    const section = await this.sectionRepository.findById(
      new Types.ObjectId(sectionId),
    );
    const course = await this.courseRepository.findById(section.course._id);

    if (course.author._id.toString() !== authorId) {
      throw new ForbiddenException(
        "You can't update a section who don't belong to you",
      );
    }
  }

  async update(
    id: string,
    editSectionDto: EditSection,
    authorId: string,
  ): Promise<Section> {
    const section: Section = await this.findById(id);

    this.isSectionAuthor(section._id.toString(), authorId);

    return this.sectionRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      editSectionDto,
    );
  }

  async reorder(
    courseId: string,
    ids: string[],
    authorId: string,
  ): Promise<Section[]> {
    const course = await this.courseRepository.findById(
      new Types.ObjectId(courseId),
    );

    if (course.author._id.toString() !== authorId) {
      throw new ForbiddenException(
        "You can't reorder the sections of a course who don't belong to you",
      );
    }

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

  async delete(id: string, authorId: string): Promise<void> {
    const section = await this.findById(id);

    this.isSectionAuthor(section._id.toString(), authorId);

    const lessons: Lesson[] = await this.lessonRepository.find({
      'section._id': new Types.ObjectId(section._id),
    });

    if (lessons.length > 0) {
      this.lessonRepository.deleteMany(lessons);
    }

    await this.sectionRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}

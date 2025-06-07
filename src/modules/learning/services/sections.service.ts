import { ForbiddenException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { CourseRepository } from '../../../modules/learning/repositories/course.repository';
import { EditSection } from '../dtos/sections/edit-section.dto';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Section } from '../schemas/section.schema';
import { Lesson } from '../schemas/lesson.schema';
import { AddSection } from '../dtos/sections/add-section.dto';
import { User } from '../../../modules/users/schemas/user.schema';

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
    return await this.sectionRepository.find({ course: id });
  }

  async getLessons(id: string): Promise<Lesson[]> {
    await this.findById(id);

    const lessons = await this.lessonRepository.find({
      'section._id': id,
    });

    return lessons;
  }

  async store(addSectionDto: AddSection): Promise<Section> {
    const course = await this.courseRepository.findById(
      new Types.ObjectId(String(addSectionDto.course_id)),
    );

    let data: Partial<Section> = {
      sect_title: addSectionDto.sect_title,
      course,
    };

    return await this.sectionRepository.create(data);
  }

  async isCourseAuthor(sectionId: string, authorId: string) {
    const section = await this.sectionRepository.findById(
      new Types.ObjectId(sectionId),
    );
    const courseAuthor: User = section.course.author;
    const courseAuthorId = courseAuthor._id;

    if (courseAuthorId.toString() !== authorId) {
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

    // this.isCourseAuthor(section.course.toString(), authorId);

    return this.sectionRepository.findByIdAndUpdate(
      new Types.ObjectId(id),
      editSectionDto,
    );
  }

  async delete(id: string, authorId: string): Promise<void> {
    const section = await this.findById(id);
    this.isCourseAuthor(section.course.author._id.toString(), authorId);

    const lessons: Lesson[] = await this.lessonRepository.find({
      'section._id': new Types.ObjectId(section._id),
    });

    if (lessons.length > 0) {
      this.lessonRepository.deleteMany(lessons);
    }

    await this.sectionRepository.findByIdAndDelete(new Types.ObjectId(id));
  }
}

import { ForbiddenException, Injectable } from '@nestjs/common';
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
    return await this.sectionRepository.aggregate([
      { $match: { course: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'course',
        },
      },
      { $unwind: '$course' },
      {
        $lookup: {
          from: 'categories',
          localField: 'course.category',
          foreignField: '_id',
          as: 'course.category',
        },
      },
      {
        $unwind: {
          path: '$course.category',
        },
      },
      {
        $project: {
          _id: 1,
          sect_title: 1,
          created_at: 1,
          updated_at: 1,
          'course._id': 1,
          'course.crs_title': 1,
          'course.category._id': 1,
          'course.category.ctgr_name': 1,
        },
      },
    ]);
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

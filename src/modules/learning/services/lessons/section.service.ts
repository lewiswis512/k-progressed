import { Injectable } from '@nestjs/common';
import { Section } from '../../schemas/section.schema';
import { LessonRepository } from '../../repositories/lesson.repository';

@Injectable()
export class SectionLessonsService {
  public constructor(private lessonRepository: LessonRepository) {}

  public async get(sectionDoc: Section) {
    return await this.lessonRepository.find({
      section: sectionDoc._id,
    });
  }
}

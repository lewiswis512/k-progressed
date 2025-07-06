import { Injectable } from '@nestjs/common';
import { LessonRepository } from '../../repositories/lesson.repository';
import { Lesson } from '../../schemas/lesson.schema';

@Injectable()
export class LessonsService {
  constructor(private lessonRepository: LessonRepository) {}

  async findAll(): Promise<Lesson[]> {
    return this.lessonRepository.find();
  }
}

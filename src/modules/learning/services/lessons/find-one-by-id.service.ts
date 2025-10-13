import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { LessonRepository } from '../../repositories/lesson.repository';
import { Lesson } from '../../schemas/lesson.schema';

@Injectable()
export class LessonService {
  constructor(private lessonRepository: LessonRepository) {}

  async byId(id: string): Promise<Lesson> {
    return await this.lessonRepository.findById(new Types.ObjectId(id), {
      populate: {
        path: 'section',
        select: '-_id sect_title course',
        populate: {
          path: 'course',
          select: '-_id author',
        },
      },
    });
  }
}

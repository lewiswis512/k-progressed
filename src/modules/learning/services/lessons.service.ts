import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { LessonRepository } from '../repositories/lesson.repository';
import { Lesson } from '../schemas/lesson.schema';

@Injectable()
export class LessonsService {
  constructor(private lessonRepository: LessonRepository) {}

  async findAll(): Promise<Lesson[]> {
    return this.lessonRepository.find();
  }

  async findById(id: string): Promise<Lesson> {
    const [lesson] = await this.lessonRepository.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'sections',
          localField: 'section',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'courses',
                localField: 'course',
                foreignField: '_id',
                as: 'course',
              },
            },
            {
              $unwind: '$course',
            },
            {
              $project: {
                _id: 0,
                sect_title: 1,
                course: {
                  author: 1,
                },
              },
            },
          ],
          as: 'section',
        },
      },
      { $unwind: '$section' },
    ]);

    return lesson;
  }
}

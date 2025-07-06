import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { Lesson } from '../../schemas/lesson.schema';
import { LessonRepository } from '../../repositories/lesson.repository';

@Injectable()
export class LessonService {
  constructor(private lessonRepository: LessonRepository) {}

  async byId(id: string): Promise<Lesson> {
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

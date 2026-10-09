import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { LessonProgress } from '../lesson-progress.schema';

export class LessonProgressRepository extends AbstractRepository<LessonProgress> {
  protected logger: Logger = new Logger();

  constructor(
    @InjectModel(LessonProgress.name)
    private lessonProgressModel: Model<LessonProgress>,
  ) {
    super(lessonProgressModel);
  }

  async markCompleted(
    userId: Types.ObjectId,
    lessonId: Types.ObjectId,
    courseId: Types.ObjectId,
  ): Promise<void> {
    await this.lessonProgressModel.updateOne(
      { user: userId, lesson: lessonId },
      {
        $setOnInsert: {
          course: courseId,
          completed_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      },
      { upsert: true },
    );
  }
}

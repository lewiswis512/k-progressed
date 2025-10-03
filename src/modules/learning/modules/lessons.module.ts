import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../../auth/auth.module';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { LessonsController } from '../controllers/lessons.controller';
import { LessonRepository } from '../repositories/lesson.repository';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { AddLessonService } from '../services/lessons/add.service';
import { DeleteLessonService } from '../services/lessons/delete.service';
import { LessonService } from '../services/lessons/find-one-by-id.service';
import { FreeLessonService } from '../services/lessons/free.service';
import { LessonsService } from '../services/lessons/list.service';
import { UpdateLessonservice } from '../services/lessons/update.service';
import { SectionsModule } from './sections.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Lesson.name, schema: LessonSchema }]),
    SectionsModule,
  ],
  providers: [
    LessonRepository,
    CloudinaryUploadStrategy,
    LessonsService,
    LessonService,
    AddLessonService,
    UpdateLessonservice,
    DeleteLessonService,
    FreeLessonService,
  ],
  controllers: [LessonsController],
  exports: [LessonRepository],
})
export class LessonsModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
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
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
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

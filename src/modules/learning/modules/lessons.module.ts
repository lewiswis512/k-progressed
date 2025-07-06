import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { Section, SectionSchema } from '../schemas/section.schema';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { LessonsController } from '../controllers/lessons.controller';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { UpdateLessonservice } from '../services/lessons/update.service';
import { DeleteLessonService } from '../services/lessons/delete.service';
import { AddLessonService } from '../services/lessons/add.service';
import { FreeLessonService } from '../services/lessons/free.service';
import { LessonService } from '../services/lessons/find-one-by-id.service';
import { LessonsService } from '../services/lessons/list.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
    MongooseModule.forFeature([
      { name: Lesson.name, schema: LessonSchema },
      { name: Section.name, schema: SectionSchema },
    ]),
  ],
  providers: [
    LessonRepository,
    SectionRepository,
    CloudinaryUploadStrategy,
    LessonsService,
    LessonService,
    AddLessonService,
    UpdateLessonservice,
    DeleteLessonService,
    FreeLessonService,
  ],
  controllers: [LessonsController],
})
export class LessonsModule {}

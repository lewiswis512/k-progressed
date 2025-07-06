import { Module } from '@nestjs/common';
import { LessonsService } from '../services/lessons.service';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { Section, SectionSchema } from '../schemas/section.schema';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { LessonsController } from '../controllers/lessons.controller';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { DeleteLessonService } from '../services/lessons/delete.service';

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
    LessonsService,
    LessonRepository,
    SectionRepository,
    CloudinaryUploadStrategy,
    DeleteLessonService,
  ],
  controllers: [LessonsController],
})
export class LessonsModule {}

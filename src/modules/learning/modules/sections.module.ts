import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { Section, SectionSchema } from '../schemas/section.schema';
import { SectionsService } from '../services/sections.service';
import { CourseRepository } from '../../../modules/learning/repositories/course.repository';
import {
  Course,
  CourseSchema,
} from '../../../modules/learning/schemas/course.schema';
import { SectionRepository } from '../repositories/section.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionsController } from '../controllers/sections.controller';

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
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  controllers: [SectionsController],
  providers: [
    SectionsService,
    SectionRepository,
    LessonRepository,
    CourseRepository,
  ],
  exports: [SectionRepository],
})
export class SectionsModule {}

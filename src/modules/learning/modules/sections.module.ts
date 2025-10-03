import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseRepository } from '../../../modules/learning/repositories/course.repository';
import {
  Course,
  CourseSchema,
} from '../../../modules/learning/schemas/course.schema';
import { AuthModule } from '../../auth/auth.module';
import { SectionsController } from '../controllers/sections.controller';
import { LessonRepository } from '../repositories/lesson.repository';
import { SectionRepository } from '../repositories/section.repository';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { Section, SectionSchema } from '../schemas/section.schema';
import { SectionsService } from '../services/sections.service';

@Module({
  imports: [
    AuthModule,
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

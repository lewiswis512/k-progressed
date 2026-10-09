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
import { CourseAccessService } from '../../../common/access/course-access.service';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';
import {
  Purchase,
  PurchaseSchema,
} from '../../purchases/schemas/purchase.schema';
import { PurchaseRepository } from '../../purchases/repository/purchase.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Course.name, schema: CourseSchema },
      { name: User.name, schema: UserSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  controllers: [SectionsController],
  providers: [
    SectionsService,
    SectionRepository,
    LessonRepository,
    CourseRepository,
    CourseAccessService,
    UserRepository,
    PurchaseRepository,
  ],
  exports: [SectionRepository, SectionsService],
})
export class SectionsModule {}

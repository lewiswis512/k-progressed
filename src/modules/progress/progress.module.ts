import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourseAccessService } from '../../common/access/course-access.service';
import { AuthModule } from '../auth/auth.module';
import { Certificate, CertificateSchema } from './certificate.schema';
import { LessonProgress, LessonProgressSchema } from './lesson-progress.schema';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { CertificateRepository } from './repositories/certificate.repository';
import { LessonProgressRepository } from './repositories/lesson-progress.repository';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserRepository } from '../users/repository/user.repository';
import { Course, CourseSchema } from '../learning/schemas/course.schema';
import { CourseRepository } from '../learning/repositories/course.repository';
import { Section, SectionSchema } from '../learning/schemas/section.schema';
import { SectionRepository } from '../learning/repositories/section.repository';
import { Lesson, LessonSchema } from '../learning/schemas/lesson.schema';
import { LessonRepository } from '../learning/repositories/lesson.repository';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: LessonProgress.name, schema: LessonProgressSchema },
      { name: Certificate.name, schema: CertificateSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  controllers: [ProgressController],
  providers: [
    ProgressService,
    CourseAccessService,
    LessonProgressRepository,
    CertificateRepository,
    UserRepository,
    CourseRepository,
    SectionRepository,
    LessonRepository,
    PurchaseRepository,
  ],
})
export class ProgressModule {}

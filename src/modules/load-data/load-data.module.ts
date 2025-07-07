import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../auth/services/auth.service';
import { UserRepository } from '../users/repository/user.repository';
import { User, UserSchema } from '../users/schemas/user.schema';
import { LoadDataController } from './load-data.controller';
import { LoadDataService } from './load-data.service';
import { UserResetRepository } from '../users/repository/user-reset.repository';
import { StripeCustomerService } from '../auth/stripe-customer.service';
import { UserReset, UserResetSchema } from '../users/schemas/user-reset.schema';
import { StripeCustomerRepository } from '../users/repository/stripe-customer.repository';
import {
  StripeCustomer,
  StripeCustomerSchema,
} from '../payment/schemas/stripe-customer.schema';
import { CategoryRepository } from '../learning/repositories/category.repository';
import { Category, CategorySchema } from '../learning/schemas/category.schema';
import { CourseRepository } from '../learning/repositories/course.repository';
import { Course, CourseSchema } from '../learning/schemas/course.schema';
import { SectionRepository } from '../learning/repositories/section.repository';
import { Section, SectionSchema } from '../learning/schemas/section.schema';
import {
  Teacher,
  TeacherSchema,
} from '../learning/schemas/teachers/teacher.schema';
import { TeacherRepository } from '../learning/repositories/teacher.repository';
import { SectionsService } from '../learning/services/sections.service';
import { LessonRepository } from '../learning/repositories/lesson.repository';
import { Lesson, LessonSchema } from '../learning/schemas/lesson.schema';
import { CoursesService } from '../learning/services/courses.service';
import { CommentRepository } from '../comments/repository/comment.repository';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';
import { CloudinaryUploadStrategy } from '../../utils/uploads/cloudinary-upload-strategy';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';

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
      { name: User.name, schema: UserSchema },
      { name: UserReset.name, schema: UserResetSchema },
      { name: StripeCustomer.name, schema: StripeCustomerSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  controllers: [LoadDataController],
  providers: [
    LoadDataService,
    AuthService,
    SectionsService,
    CoursesService,
    UserRepository,
    UserResetRepository,
    StripeCustomerService,
    StripeCustomerRepository,
    CategoryRepository,
    TeacherRepository,
    CourseRepository,
    SectionRepository,
    LessonRepository,
    CommentRepository,
    PurchaseRepository,
    CloudinaryUploadStrategy,
  ],
})
export class LoadDataModule {}

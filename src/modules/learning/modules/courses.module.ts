import { Module } from '@nestjs/common';
import { CoursesController } from '../controllers/courses.controller';
import { CoursesService } from '../services/courses.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from '../schemas/course.schema';
import { JwtModule } from '@nestjs/jwt';
import { Comment, CommentSchema } from '../../comments/schemas/comment.schema';
import {
  Section,
  sectionSchema,
} from '../../../modules/learning/schemas/sections/section.schema';
import {
  Lesson,
  LessonSchema,
} from '../../../modules/learning/schemas/lessons/lesson.schema';
import { CourseRepository } from '../repositories/course.repository';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { CommentRepository } from '../../../modules/comments/repository/comment.repository';
import { User, UserSchema } from '../../../modules/users/schemas/user.schema';
import { SectionRepository } from '../repositories/section.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary';
import { PurchaseRepository } from '../../../modules/purchases/repository/purchase.repository';
import {
  Purchase,
  PurchaseSchema,
} from '../../../modules/purchases/schemas/purchase.schema';
import { CategoryRepository } from '../repositories/category.repository';
import { Category, CategorySchema } from '../schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Category.name, schema: CategorySchema },
      { name: User.name, schema: UserSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Section.name, schema: sectionSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
  ],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    CourseRepository,
    CategoryRepository,
    UserRepository,
    CommentRepository,
    SectionRepository,
    LessonRepository,
    PurchaseRepository,
    CloudinaryUploadStrategy,
  ],
})
export class CoursesModule {}

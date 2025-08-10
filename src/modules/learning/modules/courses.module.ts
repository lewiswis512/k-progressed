import { Module } from '@nestjs/common';
import { CoursesController } from '../controllers/courses.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Course, CourseSchema } from '../schemas/course.schema';
import { JwtModule } from '@nestjs/jwt';
import { Comment, CommentSchema } from '../../comments/schemas/comment.schema';
import { Section, SectionSchema } from '../schemas/section.schema';
import { Lesson, LessonSchema } from '../schemas/lesson.schema';
import { CourseRepository } from '../repositories/course.repository';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { CommentRepository } from '../../../modules/comments/repository/comment.repository';
import { User, UserSchema } from '../../../modules/users/schemas/user.schema';
import { SectionRepository } from '../repositories/section.repository';
import { LessonRepository } from '../repositories/lesson.repository';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { PurchaseRepository } from '../../../modules/purchases/repository/purchase.repository';
import {
  Purchase,
  PurchaseSchema,
} from '../../../modules/purchases/schemas/purchase.schema';
import { CategoryRepository } from '../repositories/category.repository';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Teacher, TeacherSchema } from '../schemas/teachers/teacher.schema';
import { TeacherRepository } from '../repositories/teacher.repository';
import { GetCourseByIdService } from '../services/courses/get-by-id.service';
import { CourseContentService } from '../services/courses/get-content.service';
import { CourseSectionsService } from '../services/courses/get-sections.service';
import { SectionLessonsService } from '../services/lessons/section.service';
import { SectionLessonsWithDurationService } from '../services/lessons/section-with-duration.service';
import { CoursesService } from '../services/courses/list.service';
import { GetCourseWithRatingService } from '../services/courses/get-with-rating.service';
import { CoursesByAuthorService } from '../services/courses/get-by-author.service';
import { GetCoursesBySlugService } from '../services/courses/get-by-slug.service';
import { AddCourseService } from '../services/courses/add.service';
import { UpdateCourseService } from '../services/courses/update.service';
import { DeleteCourseService } from '../services/courses/delete.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: User.name, schema: UserSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Section.name, schema: SectionSchema },
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
    GetCourseByIdService,
    CourseContentService,
    CourseSectionsService,
    SectionLessonsService,
    SectionLessonsWithDurationService,
    GetCourseWithRatingService,
    CoursesByAuthorService,
    GetCoursesBySlugService,
    AddCourseService,
    UpdateCourseService,
    DeleteCourseService,
    CourseRepository,
    CategoryRepository,
    TeacherRepository,
    UserRepository,
    CommentRepository,
    SectionRepository,
    LessonRepository,
    PurchaseRepository,
    CloudinaryUploadStrategy,
  ],
})
export class CoursesModule {}

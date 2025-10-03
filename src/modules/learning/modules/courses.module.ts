import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
import { CommentsModule } from '../../comments/comments.module';
import { CommentRepository } from '../../comments/repository/comment.repository';
import { Comment, CommentSchema } from '../../comments/schemas/comment.schema';
import { PurchasesModule } from '../../purchases/purchases.module';
import { PurchaseRepository } from '../../purchases/repository/purchase.repository';
import {
  Purchase,
  PurchaseSchema,
} from '../../purchases/schemas/purchase.schema';
import { UserRepository } from '../../users/repository/user.repository';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { CoursesController } from '../controllers/courses.controller';
import { CourseRepository } from '../repositories/course.repository';
import { Course, CourseSchema } from '../schemas/course.schema';
import { AddCourseService } from '../services/courses/add.service';
import { DeleteCourseService } from '../services/courses/delete.service';
import { CoursesByAuthorService } from '../services/courses/get-by-author.service';
import { CoursesByCategoryService } from '../services/courses/get-by-category.service';
import { GetCourseByIdService } from '../services/courses/get-by-id.service';
import { GetCoursesBySlugService } from '../services/courses/get-by-slug.service';
import { CourseContentService } from '../services/courses/get-content.service';
import { CourseSectionsService } from '../services/courses/get-sections.service';
import { GetCoursesWithRatingService } from '../services/courses/get-with-rating.service';
import { CoursesService } from '../services/courses/list.service';
import { UpdateCourseService } from '../services/courses/update.service';
import { SectionLessonsService } from '../services/lessons/section.service';
import { CategoriesModule } from './category.module';
import { LessonsModule } from './lessons.module';
import { SectionsModule } from './sections.module';
import { TeachersModule } from './teachers.module';
import { AuthModule } from '../../auth/auth.module';
import { GetCourseWithRatingService } from '../services/courses/get-one-with-rating.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    CategoriesModule,
    TeachersModule,
    SectionsModule,
    LessonsModule,
    CommentsModule,
    PurchasesModule,
  ],
  controllers: [CoursesController],
  providers: [
    CoursesService,
    GetCourseByIdService,
    CourseContentService,
    CourseSectionsService,
    SectionLessonsService,
    GetCoursesWithRatingService,
    GetCourseWithRatingService,
    CoursesByCategoryService,
    CoursesByAuthorService,
    GetCoursesBySlugService,
    AddCourseService,
    UpdateCourseService,
    DeleteCourseService,
    CloudinaryUploadStrategy,
    CourseRepository,
    CommentRepository,
    PurchaseRepository,
    UserRepository,
  ],
  exports: [
    GetCoursesWithRatingService,
    CoursesByCategoryService,
    CourseRepository,
  ],
})
export class CoursesModule {}

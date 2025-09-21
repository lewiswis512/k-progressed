import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryUploadStrategy } from '../../../utils/uploads/cloudinary-upload-strategy';
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
import { GetCourseWithRatingService } from '../services/courses/get-with-rating.service';
import { CoursesService } from '../services/courses/list.service';
import { UpdateCourseService } from '../services/courses/update.service';
import { SectionLessonsWithDurationService } from '../services/lessons/section-with-duration.service';
import { SectionLessonsService } from '../services/lessons/section.service';
import { CategoriesModule } from './category.module';
import { TeachersModule } from './teachers.module';
import { SectionsModule } from './sections.module';
import { LessonsModule } from './lessons.module';
import { CommentsModule } from '../../comments/comments.module';
import { PurchasesModule } from '../../purchases/purchases.module';
import { CommentRepository } from '../../comments/repository/comment.repository';
import { PurchaseRepository } from '../../purchases/repository/purchase.repository';
import { UserRepository } from '../../users/repository/user.repository';
import { Comment, CommentSchema } from '../../comments/schemas/comment.schema';
import {
  Purchase,
  PurchaseSchema,
} from '../../purchases/schemas/purchase.schema';
import { User, UserSchema } from '../../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
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
    SectionLessonsWithDurationService,
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
    GetCourseWithRatingService,
    CoursesByCategoryService,
    CourseRepository,
  ],
})
export class CoursesModule {}

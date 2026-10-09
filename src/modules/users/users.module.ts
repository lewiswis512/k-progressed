import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoRepository } from '../../common/repository/mongo.repository';
import { CloudinaryUploadStrategy } from '../../utils/uploads/cloudinary-upload-strategy';
import {
  StripeCustomer,
  StripeCustomerSchema,
} from '../payment/schemas/stripe-customer.schema';
import { CheckingController } from './controllers/checking.controller';
import { StripeCustomerRepository } from './repository/stripe-customer.repository';
import { UserResetRepository } from './repository/user-reset.repository';
import { UserRepository } from './repository/user.repository';
import { UserReset, UserResetSchema } from './schemas/user-reset.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';
import { Course, CourseSchema } from '../learning/schemas/course.schema';
import { CourseRepository } from '../learning/repositories/course.repository';
import {
  Teacher,
  TeacherSchema,
} from '../learning/schemas/teachers/teacher.schema';
import { TeacherRepository } from '../learning/repositories/teacher.repository';
import { Comment, CommentSchema } from '../comments/schemas/comment.schema';
import { CommentRepository } from '../comments/repository/comment.repository';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';
import { Booking, BookingSchema } from '../learning/schemas/booking.schema';
import { BookingRepository } from '../learning/repositories/booking.repository';
import {
  LessonProgress,
  LessonProgressSchema,
} from '../progress/lesson-progress.schema';
import { LessonProgressRepository } from '../progress/repositories/lesson-progress.repository';
import { Certificate, CertificateSchema } from '../progress/certificate.schema';
import { CertificateRepository } from '../progress/repositories/certificate.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserReset.name, schema: UserResetSchema },
      { name: StripeCustomer.name, schema: StripeCustomerSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: LessonProgress.name, schema: LessonProgressSchema },
      { name: Certificate.name, schema: CertificateSchema },
    ]),
  ],
  providers: [
    UsersService,
    UserRepository,
    UserResetRepository,
    StripeCustomerRepository,
    CloudinaryUploadStrategy,
    MongoRepository,
    CourseRepository,
    TeacherRepository,
    CommentRepository,
    PurchaseRepository,
    BookingRepository,
    LessonProgressRepository,
    CertificateRepository,
  ],
  exports: [UsersService, StripeCustomerRepository, UserRepository],
  controllers: [UsersController, CheckingController],
})
export class UsersModule {}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StatisticController } from './statistic.controller';
import { StatisticService } from './statistic.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserRepository } from '../users/repository/user.repository';
import {
  Teacher,
  TeacherSchema,
} from '../learning/schemas/teachers/teacher.schema';
import { TeacherRepository } from '../learning/repositories/teacher.repository';
import { Course, CourseSchema } from '../learning/schemas/course.schema';
import { CourseRepository } from '../learning/repositories/course.repository';
import { Purchase, PurchaseSchema } from '../purchases/schemas/purchase.schema';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';
import { Booking, BookingSchema } from '../learning/schemas/booking.schema';
import { BookingRepository } from '../learning/repositories/booking.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Teacher.name, schema: TeacherSchema },
      { name: Course.name, schema: CourseSchema },
      { name: Purchase.name, schema: PurchaseSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
    AuthModule,
  ],
  controllers: [StatisticController],
  providers: [
    StatisticService,
    UserRepository,
    TeacherRepository,
    CourseRepository,
    PurchaseRepository,
    BookingRepository,
  ],
})
export class StatisticModule {}

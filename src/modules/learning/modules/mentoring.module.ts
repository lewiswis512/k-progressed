import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../../auth/auth.module';
import { StripeService } from '../../payment/service/stripe.service';
import { MentoringController } from '../controllers/mentoring.controller';
import { BookingRepository } from '../repositories/booking.repository';
import { Booking, BookingSchema } from '../schemas/booking.schema';
import { BookingsService } from '../services/bookings.service';
import { MentorBookingNotificationService } from '../services/mentor-booking-notification.service';
import { TeachersModule } from './teachers.module';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';

@Module({
  imports: [
    AuthModule,
    TeachersModule,
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MentoringController],
  providers: [
    MentorBookingNotificationService,
    BookingsService,
    BookingRepository,
    StripeService,
    UserRepository,
  ],
  exports: [BookingsService],
})
export class MentoringModule {}

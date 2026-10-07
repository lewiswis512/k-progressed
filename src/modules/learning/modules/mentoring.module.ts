import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../../modules/users/schemas/user.schema';
import { AuthModule } from '../../auth/auth.module';
import { UserRepository } from '../../users/repository/user.repository';
import { MentoringController } from '../controllers/mentoring.controller';
import { BookingRepository } from '../repositories/booking.repository';
import { Booking, BookingSchema } from '../schemas/booking.schema';
import { BookingsService } from '../services/bookings.service';
import { MentorBookingNotificationService } from '../services/mentor-booking-notification.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Booking.name, schema: BookingSchema },
    ]),
  ],
  controllers: [MentoringController],
  providers: [
    MentorBookingNotificationService,
    UserRepository,
    BookingsService,
    BookingRepository,
  ],
  exports: [BookingsService],
})
export class MentoringModule {}

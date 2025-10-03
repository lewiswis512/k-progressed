import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../../modules/users/schemas/user.schema';
import { UserRepository } from '../../users/repository/user.repository';
import { MentoringController } from '../controllers/mentoring.controller';
import { MentorBookingNotificationService } from '../services/mentor-booking-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [MentoringController],
  providers: [MentorBookingNotificationService, UserRepository],
})
export class MentoringModule {}

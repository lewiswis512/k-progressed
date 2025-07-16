import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserRepository } from '../../users/repository/user.repository';
import { MentoringController } from '../controllers/mentoring.controller';
import { MentorBookingNotificationService } from '../services/mentor-booking-notification.service';
import { User, UserSchema } from '../../../modules/users/schemas/user.schema';

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [MentoringController],
  providers: [MentorBookingNotificationService, UserRepository],
})
export class MentoringModule {}

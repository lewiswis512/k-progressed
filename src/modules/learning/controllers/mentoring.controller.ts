import { Body, Controller, Post } from '@nestjs/common';
import {
  IBookingInformation,
  MentorBookingNotificationService,
} from '../services/mentor-booking-notification.service';

@Controller('/mentoring')
export class MentoringController {
  constructor(
    private mentorBookingNotificationService: MentorBookingNotificationService,
  ) {}

  @Post()
  async sendMail(@Body() bookingInformation: IBookingInformation) {
    await this.mentorBookingNotificationService.send(bookingInformation);
  }
}

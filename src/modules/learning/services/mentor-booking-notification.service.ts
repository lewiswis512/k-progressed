import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { User } from '../../../modules/users/schemas/user.schema';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { studentBookingNotificationTemplate } from '../../../templates/student-booking-notification';
import { teacherBookingNotificationTemplate } from '../../../templates/teacher-booking-notification';
import { MENTORING_BOOKING_CONFIRMATION_EMAIL } from '../../../utils/constants/mailing/email';
import { UserTypeEnum } from '../../../utils/enums/user-type.enum';

export interface IBookingInformation {
  date: Date;
  time: string;
  bookerLastname: string;
  bookerFirstname: string;
  bookerEmail: string;
  teacherLastname: string;
  teacherFirstname: string;
  teacherEmail: string;
}

@Injectable()
export class MentorBookingNotificationService {
  constructor(
    private userRepository: UserRepository,
    private mailerService: MailerService,
  ) {}

  async send(bookingInformation: IBookingInformation) {
    await this.sendTo(bookingInformation, UserTypeEnum.STUDENT);
    await this.sendTo(bookingInformation, UserTypeEnum.TEACHER);
  }

  async sendTo(
    bookingInformation: IBookingInformation,
    userType: UserTypeEnum,
  ) {
    const user: User = await this.userRepository.findOne({
      usr_email:
        userType === UserTypeEnum.STUDENT
          ? bookingInformation.bookerEmail
          : bookingInformation.teacherEmail,
    });

    user.usr_password = null;
    const htmlTemplate =
      userType === UserTypeEnum.STUDENT
        ? studentBookingNotificationTemplate(bookingInformation)
        : teacherBookingNotificationTemplate(bookingInformation);

    try {
      await this.mailerService.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.usr_email,
        subject: MENTORING_BOOKING_CONFIRMATION_EMAIL,
        html: htmlTemplate,
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }
  }
}

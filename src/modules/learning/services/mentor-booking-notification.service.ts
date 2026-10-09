import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import {
  bookingCancelledTemplate,
  bookingConfirmedTemplate,
} from '../../../templates/booking-notifications';
import {
  MENTORING_BOOKING_CANCELLED_EMAIL,
  MENTORING_BOOKING_CONFIRMATION_EMAIL,
} from '../../../utils/constants/mailing/email';
import { formatZonedDateTime } from '../../../utils/dates/zoned-date-time';
import { MENTORING_TIMEZONE } from '../constants/mentoring';
import { errorStack } from '../../../utils/errors';

export interface IBookingParty {
  usr_username: string;
  usr_firstname?: string;
  usr_lastname?: string;
  usr_email: string;
}

export interface IBookingForEmail {
  bkng_starts_at?: Date;
  bkng_meeting_url?: string;
  bkng_amount?: number;
  booker: IBookingParty;
  teacherUser: IBookingParty;
}

const displayName = (user: IBookingParty): string =>
  [user.usr_firstname, user.usr_lastname].filter(Boolean).join(' ') ||
  user.usr_username;

@Injectable()
export class MentorBookingNotificationService {
  private readonly logger = new Logger(MentorBookingNotificationService.name);

  constructor(private mailerService: MailerService) {}

  private bookingsLink(): string {
    return `${process.env.FRONTEND_URL}/bookings`;
  }

  async sendConfirmed(booking: IBookingForEmail): Promise<void> {
    const when = formatZonedDateTime(
      booking.bkng_starts_at,
      MENTORING_TIMEZONE,
    );

    await this.sendMail(
      booking.booker.usr_email,
      MENTORING_BOOKING_CONFIRMATION_EMAIL,
      bookingConfirmedTemplate(
        {
          recipientName: displayName(booking.booker),
          otherPartyName: displayName(booking.teacherUser),
          when,
          meetingUrl: booking.bkng_meeting_url,
          bookingsLink: this.bookingsLink(),
          amount: booking.bkng_amount,
        },
        'student',
      ),
    );
    await this.sendMail(
      booking.teacherUser.usr_email,
      MENTORING_BOOKING_CONFIRMATION_EMAIL,
      bookingConfirmedTemplate(
        {
          recipientName: displayName(booking.teacherUser),
          otherPartyName: displayName(booking.booker),
          when,
          meetingUrl: booking.bkng_meeting_url,
          bookingsLink: this.bookingsLink(),
        },
        'teacher',
      ),
    );
  }

  async sendCancelled(
    booking: IBookingForEmail,
    refunded: boolean,
  ): Promise<void> {
    const when = formatZonedDateTime(
      booking.bkng_starts_at,
      MENTORING_TIMEZONE,
    );

    await this.sendMail(
      booking.booker.usr_email,
      MENTORING_BOOKING_CANCELLED_EMAIL,
      bookingCancelledTemplate({
        recipientName: displayName(booking.booker),
        otherPartyName: displayName(booking.teacherUser),
        when,
        bookingsLink: this.bookingsLink(),
        refunded,
      }),
    );
    await this.sendMail(
      booking.teacherUser.usr_email,
      MENTORING_BOOKING_CANCELLED_EMAIL,
      bookingCancelledTemplate({
        recipientName: displayName(booking.teacherUser),
        otherPartyName: displayName(booking.booker),
        when,
        bookingsLink: this.bookingsLink(),
      }),
    );
  }

  private async sendMail(to: string, subject: string, html: string) {
    try {
      await this.mailerService.sendMail({
        from: process.env.EMAIL_FROM,
        to,
        subject,
        html,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send "${subject}" to ${to}`,
        errorStack(error),
      );
    }
  }
}

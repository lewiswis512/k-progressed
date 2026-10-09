import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { StripeService } from '../../payment/service/stripe.service';
import { BookingStatusEnum } from '../../../utils/enums/booking-status.enum';
import { RoleEnum } from '../../../utils/enums/role.enum';
import {
  dayOfWeek,
  zonedDateTimeToUtc,
} from '../../../utils/dates/zoned-date-time';
import {
  DEFAULT_MENTOR_AVAILABILITY,
  MENTORING_BOOKING_WINDOW_DAYS,
  MENTORING_CANCELLATION_NOTICE_HOURS,
  MENTORING_MIN_NOTICE_HOURS,
  MENTORING_TIMEZONE,
} from '../constants/mentoring';
import { BookingRepository } from '../repositories/booking.repository';
import { TeacherRepository } from '../repositories/teacher.repository';
import { Booking } from '../schemas/booking.schema';
import { Teacher } from '../schemas/teachers/teacher.schema';
import {
  IBookingForEmail,
  MentorBookingNotificationService,
} from './mentor-booking-notification.service';
import { errorStack, isDuplicateKeyError } from '../../../utils/errors';
import { UserRepository } from '../../users/repository/user.repository';

export const BOOKING_HOLD_MINUTES = 15;
const HOUR = 60 * 60 * 1000;

interface IHoldSlot {
  teacher: Teacher;
  bookerId: string;
  date: string;
  time: string;
}

interface IBookingUser {
  id: string;
  role?: RoleEnum;
}

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private bookingRepository: BookingRepository,
    private teacherRepository: TeacherRepository,
    private stripeService: StripeService,
    private notificationService: MentorBookingNotificationService,
    private userRepository: UserRepository,
  ) {}

  startsAt(date: string, time: string): Date {
    return zonedDateTimeToUtc(date, time, MENTORING_TIMEZONE);
  }

  private timesForDay(teacher: Teacher, date: string): string[] {
    const availability = teacher.tchr_availability?.length
      ? teacher.tchr_availability
      : DEFAULT_MENTOR_AVAILABILITY;
    const day = dayOfWeek(date);

    return availability.find((slot) => slot.day === day)?.times ?? [];
  }

  private isBookableInstant(startsAt: Date): boolean {
    const now = Date.now();

    return (
      startsAt.getTime() >= now + MENTORING_MIN_NOTICE_HOURS * HOUR &&
      startsAt.getTime() <= now + MENTORING_BOOKING_WINDOW_DAYS * 24 * HOUR
    );
  }

  async getAvailableTimes(
    teacherId: string,
    date: string,
    viewerId?: string,
  ): Promise<string[]> {
    const teacher = await this.teacherRepository.findById(
      new Types.ObjectId(teacherId),
    );
    const taken = new Set(
      await this.bookingRepository.findTakenTimes(teacherId, date, viewerId),
    );

    return this.timesForDay(teacher, date).filter(
      (time) =>
        !taken.has(time) && this.isBookableInstant(this.startsAt(date, time)),
    );
  }

  async getTakenTimes(
    teacherId: string,
    date: string,
    viewerId?: string,
  ): Promise<string[]> {
    return this.bookingRepository.findTakenTimes(teacherId, date, viewerId);
  }

  async hold({ teacher, bookerId, date, time }: IHoldSlot): Promise<Booking> {
    const teacherId = teacher._id.toString();

    if (String(teacher.author?._id ?? teacher.author) === bookerId) {
      throw new BadRequestException("You can't book a call with yourself");
    }

    if (!this.timesForDay(teacher, date).includes(time)) {
      throw new BadRequestException(
        'This mentor is not available at this time',
      );
    }

    const startsAt = this.startsAt(date, time);

    if (!this.isBookableInstant(startsAt)) {
      throw new BadRequestException(
        `Calls must be booked at least ${MENTORING_MIN_NOTICE_HOURS} hours in advance and within ${MENTORING_BOOKING_WINDOW_DAYS} days`,
      );
    }

    if (await this.bookingRepository.isTaken(teacherId, date, time, bookerId)) {
      throw new ConflictException('This time slot is already booked');
    }

    await this.bookingRepository.releasePendingHolds(teacherId, bookerId);

    const booker = await this.userRepository.findPublicById(
      new Types.ObjectId(bookerId),
    );

    const booking = await this.bookingRepository.create({
      bkng_date: date,
      bkng_time: time,
      bkng_starts_at: startsAt,
      bkng_amount: teacher.tchr_hourly_rate,
      bkng_status: BookingStatusEnum.PENDING,
      bkng_expires_at: new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000),
      teacher,
      booker,
    });

    const competing = await this.bookingRepository.findCompetingHold(
      teacherId,
      date,
      time,
      booking._id,
    );

    if (competing) {
      await this.bookingRepository.findByIdAndDelete(booking._id);
      throw new ConflictException('This time slot is already booked');
    }

    return booking;
  }

  async attachPaymentIntent(
    bookingId: Types.ObjectId,
    paymentIntentId: string,
  ) {
    await this.bookingRepository.findByIdAndUpdate(bookingId, {
      bkng_payment_intent_id: paymentIntentId,
    });
  }

  private async populated(bookingId: Types.ObjectId | string) {
    return this.bookingRepository.findById(
      new Types.ObjectId(String(bookingId)),
      {
        populate: [
          {
            path: 'teacher',
            select: 'tchr_title tchr_hourly_rate author',
            populate: {
              path: 'author',
              select:
                'usr_username usr_firstname usr_lastname usr_email usr_slug usr_photo',
            },
          },
          {
            path: 'booker',
            select:
              'usr_username usr_firstname usr_lastname usr_email usr_photo',
          },
        ],
      },
    );
  }

  private forEmail(booking: Booking): IBookingForEmail {
    return {
      bkng_starts_at:
        booking.bkng_starts_at ??
        this.startsAt(booking.bkng_date, booking.bkng_time),
      bkng_meeting_url: booking.bkng_meeting_url,
      bkng_amount: booking.bkng_amount,
      booker: booking.booker,
      teacherUser: booking.teacher.author,
    };
  }

  async confirm(bookingId: string): Promise<void> {
    const current = await this.bookingRepository.findOneOrNull({
      _id: new Types.ObjectId(bookingId),
    });

    if (!current || current.bkng_status === BookingStatusEnum.CONFIRMED) {
      return;
    }

    try {
      await this.bookingRepository.findByIdAndUpdate(current._id, {
        bkng_status: BookingStatusEnum.CONFIRMED,
        bkng_meeting_url: `https://meet.jit.si/KProgressed-${current._id}-${randomBytes(4).toString('hex')}`,
        $unset: { bkng_expires_at: 1 },
        updated_at: new Date(),
      });
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException('This time slot has already been booked');
      }

      throw error;
    }

    const booking = await this.populated(current._id);

    await this.notificationService.sendConfirmed(this.forEmail(booking));
  }

  async cancelAfterPaymentConflict(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findOneOrNull({
      _id: new Types.ObjectId(bookingId),
    });

    if (!booking) {
      return;
    }

    if (booking.bkng_payment_intent_id) {
      await this.stripeService.stripe.refunds.create({
        payment_intent: booking.bkng_payment_intent_id,
      });
    }

    await this.bookingRepository.findByIdAndUpdate(booking._id, {
      bkng_status: BookingStatusEnum.CANCELLED,
      bkng_cancelled_at: new Date(),
      bkng_cancelled_by: 'system',
      bkng_refunded: !!booking.bkng_payment_intent_id,
      $unset: { bkng_expires_at: 1 },
    });

    await this.notificationService.sendCancelled(
      this.forEmail(await this.populated(booking._id)),
      !!booking.bkng_payment_intent_id,
    );
  }

  async releaseHold(bookingId: string): Promise<void> {
    await this.bookingRepository.deleteMany({
      _id: new Types.ObjectId(bookingId),
      bkng_status: BookingStatusEnum.PENDING,
    });
  }

  async markRefunded(paymentIntentId: string): Promise<void> {
    await this.bookingRepository.findOneAndUpdate(
      { bkng_payment_intent_id: paymentIntentId },
      { bkng_refunded: true },
    );
  }

  async listForBooker(userId: string): Promise<Booking[]> {
    return this.bookingRepository.find(
      {
        booker: new Types.ObjectId(userId),
        bkng_status: { $ne: BookingStatusEnum.PENDING },
      },
      {
        populate: {
          path: 'teacher',
          select: 'tchr_title author',
          populate: {
            path: 'author',
            select:
              'usr_username usr_firstname usr_lastname usr_slug usr_photo',
          },
        },
      },
    );
  }

  async listForTeacher(userId: string): Promise<Booking[]> {
    const teacher = await this.teacherRepository.findOneOrNull({
      author: new Types.ObjectId(userId),
    });

    if (!teacher) {
      return [];
    }

    return this.bookingRepository.find(
      {
        teacher: teacher._id,
        bkng_status: { $ne: BookingStatusEnum.PENDING },
      },
      {
        populate: {
          path: 'booker',
          select: 'usr_username usr_firstname usr_lastname usr_email usr_photo',
        },
      },
    );
  }

  async cancel(bookingId: string, user: IBookingUser): Promise<Booking> {
    const booking = await this.populated(bookingId);
    const teacherUserId = String(booking.teacher?.author?._id ?? '');
    const bookerId = String(booking.booker._id);
    const isBooker = bookerId === user.id;
    const isTeacher = teacherUserId === user.id;
    const isAdmin = user.role === RoleEnum.SUPERADMIN;

    if (!isBooker && !isTeacher && !isAdmin) {
      throw new ForbiddenException("You can't cancel this booking");
    }

    if (booking.bkng_status !== BookingStatusEnum.CONFIRMED) {
      throw new BadRequestException('Only confirmed calls can be cancelled');
    }

    const startsAt =
      booking.bkng_starts_at ??
      this.startsAt(booking.bkng_date, booking.bkng_time);

    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('This call has already started');
    }

    if (
      isBooker &&
      !isAdmin &&
      startsAt.getTime() - Date.now() <
        MENTORING_CANCELLATION_NOTICE_HOURS * HOUR
    ) {
      throw new BadRequestException(
        `Calls can only be cancelled up to ${MENTORING_CANCELLATION_NOTICE_HOURS} hours before they start`,
      );
    }

    let refunded = false;

    if (booking.bkng_payment_intent_id) {
      try {
        await this.stripeService.stripe.refunds.create({
          payment_intent: booking.bkng_payment_intent_id,
        });
        refunded = true;
      } catch (error: unknown) {
        this.logger.error('Failed to refund the booking', errorStack(error));
        throw new BadRequestException(
          'The refund could not be processed. Please contact the support team.',
        );
      }
    }

    const updated = await this.bookingRepository.findByIdAndUpdate(
      booking._id,
      {
        bkng_status: BookingStatusEnum.CANCELLED,
        bkng_cancelled_at: new Date(),
        bkng_cancelled_by:
          isAdmin && !isBooker && !isTeacher
            ? 'admin'
            : isBooker
              ? 'booker'
              : 'teacher',
        bkng_refunded: refunded,
        updated_at: new Date(),
      },
    );

    await this.notificationService.sendCancelled(
      this.forEmail(booking),
      refunded,
    );

    return updated;
  }
}

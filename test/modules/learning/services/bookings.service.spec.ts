import { BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BookingStatusEnum } from '../../../../src/utils/enums/booking-status.enum';
import {
  BOOKING_HOLD_MINUTES,
  BookingsService,
} from '../../../../src/modules/learning/services/bookings.service';
import { BookingRepository } from '../../../../src/modules/learning/repositories/booking.repository';
import { TeacherRepository } from '../../../../src/modules/learning/repositories/teacher.repository';
import { UserRepository } from '../../../../src/modules/users/repository/user.repository';
import { Teacher } from '../../../../src/modules/learning/schemas/teachers/teacher.schema';
import { StripeService } from '../../../../src/modules/payment/service/stripe.service';
import { MentorBookingNotificationService } from '../../../../src/modules/learning/services/mentor-booking-notification.service';

describe('BookingsService.hold', () => {
  const NOW = new Date('2026-10-05T08:00:00.000Z');
  const mentorUserId = new Types.ObjectId();
  const bookerId = new Types.ObjectId().toString();

  const teacher = (extra: Record<string, unknown> = {}) =>
    ({
      _id: new Types.ObjectId(),
      author: mentorUserId,
      tchr_is_mentor: true,
      tchr_hourly_rate: 80,
      tchr_availability: [
        { day: 1, times: ['09:00', '14:00'] },
        { day: 3, times: ['18:00'] },
      ],
      ...extra,
    }) as unknown as Teacher;

  let repository: Record<string, jest.Mock>;
  let service: BookingsService;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW.getTime());
    repository = {
      isTaken: jest.fn().mockResolvedValue(false),
      releasePendingHolds: jest.fn().mockResolvedValue(undefined),
      create: jest.fn(async (data) => ({ _id: new Types.ObjectId(), ...data })),
      findCompetingHold: jest.fn().mockResolvedValue(false),
      findByIdAndDelete: jest.fn().mockResolvedValue(null),
    };
    service = new BookingsService(
      repository as unknown as BookingRepository,
      {} as TeacherRepository,
      { stripe: {} } as StripeService,
      {} as MentorBookingNotificationService,
      {
        findPublicById: jest.fn(async (_id: Types.ObjectId) => ({ _id })),
      } as unknown as UserRepository,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should hold an available slot with the server side price', async () => {
    const mentor = teacher();

    const booking = await service.hold({
      teacher: mentor,
      bookerId,
      date: '2026-10-12',
      time: '14:00',
    });

    expect(repository.releasePendingHolds).toHaveBeenCalledWith(
      String(mentor._id),
      bookerId,
    );
    expect(booking).toMatchObject({
      bkng_date: '2026-10-12',
      bkng_time: '14:00',
      bkng_amount: 80,
      bkng_status: BookingStatusEnum.PENDING,
    });
    expect((booking.bkng_starts_at as Date).toISOString()).toBe(
      '2026-10-12T12:00:00.000Z',
    );
    expect((booking.bkng_expires_at as Date).getTime()).toBe(
      NOW.getTime() + BOOKING_HOLD_MINUTES * 60 * 1000,
    );
    expect(String(booking.booker._id)).toBe(bookerId);
  });

  it('should refuse a call with yourself, with a populated or a raw author', async () => {
    await expect(
      service.hold({
        teacher: teacher(),
        bookerId: String(mentorUserId),
        date: '2026-10-12',
        time: '09:00',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.hold({
        teacher: teacher({ author: { _id: mentorUserId } }),
        bookerId: String(mentorUserId),
        date: '2026-10-12',
        time: '09:00',
      }),
    ).rejects.toThrow("You can't book a call with yourself");
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([
    ['a time not offered that day', '2026-10-12', '10:00'],
    ['a day without availability', '2026-10-13', '09:00'],
    ['a time of another day', '2026-10-14', '09:00'],
  ])('should refuse %s', async (_label, date, time) => {
    await expect(
      service.hold({ teacher: teacher(), bookerId, date, time }),
    ).rejects.toThrow('This mentor is not available at this time');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should use the default availability when the mentor has none', async () => {
    const mentor = teacher({ tchr_availability: [] });

    await expect(
      service.hold({
        teacher: mentor,
        bookerId,
        date: '2026-10-13',
        time: '11:00',
      }),
    ).resolves.toBeDefined();
    await expect(
      service.hold({
        teacher: mentor,
        bookerId,
        date: '2026-10-11',
        time: '11:00',
      }),
    ).rejects.toThrow('This mentor is not available at this time');
  });

  it.each([
    ['in the past', '2026-09-28', '09:00'],
    ['less than 12 hours ahead', '2026-10-05', '14:00'],
    ['more than 90 days ahead', '2027-01-11', '09:00'],
  ])('should refuse a slot %s', async (_label, date, time) => {
    await expect(
      service.hold({ teacher: teacher(), bookerId, date, time }),
    ).rejects.toThrow(/at least 12 hours in advance/);
    expect(repository.isTaken).not.toHaveBeenCalled();
  });

  it('should accept a slot just after the minimum notice', async () => {
    jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-10-04T23:59:00.000Z').getTime());

    await expect(
      service.hold({
        teacher: teacher(),
        bookerId,
        date: '2026-10-05',
        time: '14:00',
      }),
    ).resolves.toBeDefined();
  });

  it('should return 409 when the slot is taken', async () => {
    repository.isTaken.mockResolvedValue(true);

    await expect(
      service.hold({
        teacher: teacher(),
        bookerId,
        date: '2026-10-12',
        time: '09:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should roll back the hold when a competing hold was created first', async () => {
    repository.findCompetingHold.mockResolvedValue(true);

    await expect(
      service.hold({
        teacher: teacher(),
        bookerId,
        date: '2026-10-12',
        time: '09:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findByIdAndDelete).toHaveBeenCalledTimes(1);
  });
});

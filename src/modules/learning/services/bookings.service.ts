import { ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { BookingStatusEnum } from '../../../utils/enums/booking-status.enum';
import { BookingRepository } from '../repositories/booking.repository';
import { Booking } from '../schemas/booking.schema';

export const BOOKING_HOLD_MINUTES = 15;

interface IHoldSlot {
  teacherId: string;
  bookerId: string;
  date: string;
  time: string;
}

@Injectable()
export class BookingsService {
  constructor(private bookingRepository: BookingRepository) {}

  async getTakenTimes(
    teacherId: string,
    date: string,
    viewerId?: string,
  ): Promise<string[]> {
    return this.bookingRepository.findTakenTimes(teacherId, date, viewerId);
  }

  async hold({ teacherId, bookerId, date, time }: IHoldSlot): Promise<Booking> {
    if (await this.bookingRepository.isTaken(teacherId, date, time, bookerId)) {
      throw new ConflictException('This time slot is already booked');
    }

    await this.bookingRepository.releasePendingHolds(teacherId, bookerId);

    return this.bookingRepository.create({
      bkng_date: date,
      bkng_time: time,
      bkng_status: BookingStatusEnum.PENDING,
      bkng_expires_at: new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000),
      teacher: new Types.ObjectId(teacherId) as any,
      booker: new Types.ObjectId(bookerId) as any,
    });
  }

  async attachPaymentIntent(
    bookingId: Types.ObjectId,
    paymentIntentId: string,
  ) {
    await this.bookingRepository.findByIdAndUpdate(bookingId, {
      bkng_payment_intent_id: paymentIntentId,
    });
  }

  async confirm(bookingId: string): Promise<void> {
    await this.bookingRepository.findByIdAndUpdate(
      new Types.ObjectId(bookingId),
      {
        bkng_status: BookingStatusEnum.CONFIRMED,
        $unset: { bkng_expires_at: 1 },
        updated_at: new Date(),
      },
    );
  }
}

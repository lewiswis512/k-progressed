import { AbstractRepository } from '../../../common/repository/abstract.repository';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { BookingStatusEnum } from '../../../utils/enums/booking-status.enum';
import { Booking } from '../schemas/booking.schema';

export class BookingRepository extends AbstractRepository<Booking> {
  protected logger: Logger = new Logger();

  constructor(@InjectModel(Booking.name) private bookingModel: Model<Booking>) {
    super(bookingModel);
  }

  activeFilter(excludeBookerId?: string): FilterQuery<Booking> {
    const pendingHold: FilterQuery<Booking> = {
      bkng_status: BookingStatusEnum.PENDING,
      bkng_expires_at: { $gt: new Date() },
    };

    if (excludeBookerId) {
      pendingHold.booker = { $ne: new Types.ObjectId(excludeBookerId) };
    }

    return {
      $or: [{ bkng_status: BookingStatusEnum.CONFIRMED }, pendingHold],
    };
  }

  async findTakenTimes(
    teacherId: string,
    date: string,
    excludeBookerId?: string,
  ): Promise<string[]> {
    return this.bookingModel.distinct('bkng_time', {
      teacher: new Types.ObjectId(teacherId),
      bkng_date: date,
      ...this.activeFilter(excludeBookerId),
    });
  }

  async isTaken(
    teacherId: string,
    date: string,
    time: string,
    excludeBookerId?: string,
  ): Promise<boolean> {
    const booking = await this.bookingModel.exists({
      teacher: new Types.ObjectId(teacherId),
      bkng_date: date,
      bkng_time: time,
      ...this.activeFilter(excludeBookerId),
    });

    return booking !== null;
  }

  async releasePendingHolds(teacherId: string, bookerId: string) {
    await this.bookingModel.deleteMany({
      teacher: new Types.ObjectId(teacherId),
      booker: new Types.ObjectId(bookerId),
      bkng_status: BookingStatusEnum.PENDING,
    });
  }
}

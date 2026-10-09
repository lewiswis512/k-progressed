import { Injectable } from '@nestjs/common';
import { BookingStatusEnum } from '../../utils/enums/booking-status.enum';
import { CourseStatusEnum } from '../../utils/enums/course-status.enum';
import { BookingRepository } from '../learning/repositories/booking.repository';
import { CourseRepository } from '../learning/repositories/course.repository';
import { TeacherRepository } from '../learning/repositories/teacher.repository';
import { PurchaseRepository } from '../purchases/repository/purchase.repository';
import { UserRepository } from '../users/repository/user.repository';

const DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class StatisticService {
  constructor(
    private userRepository: UserRepository,
    private teacherRepository: TeacherRepository,
    private courseRepository: CourseRepository,
    private purchaseRepository: PurchaseRepository,
    private bookingRepository: BookingRepository,
  ) {}

  private async revenueSince(since?: Date) {
    const result = await this.purchaseRepository.revenueSince(since);

    return {
      revenue: Math.round((result?.revenue ?? 0) * 100) / 100,
      orders: result?.orders ?? 0,
    };
  }

  async stats() {
    const last30Days = new Date(Date.now() - 30 * DAY);

    const [
      allTime,
      lastMonth,
      users,
      newUsers,
      teachers,
      coursesByStatus,
      refunds,
      bookings,
      topCourses,
      salesByDay,
    ] = await Promise.all([
      this.revenueSince(),
      this.revenueSince(last30Days),
      this.userRepository.countDocuments(),
      this.userRepository.countDocuments({ created_at: { $gte: last30Days } }),
      this.teacherRepository.countDocuments(),
      this.courseRepository.countByStatus(),
      this.purchaseRepository.countDocuments({ purch_status: 'refunded' }),
      this.bookingRepository.countDocuments({
        bkng_status: BookingStatusEnum.CONFIRMED,
      }),
      this.purchaseRepository.topCourses(5),
      this.purchaseRepository.salesByDaySince(last30Days),
    ]);

    const courseCount = (status: CourseStatusEnum) =>
      coursesByStatus.find((item) => item._id === status)?.count ?? 0;

    return {
      revenue: {
        allTime: allTime.revenue,
        last30Days: lastMonth.revenue,
      },
      orders: {
        allTime: allTime.orders,
        last30Days: lastMonth.orders,
        refunded: refunds,
      },
      users: { total: users, last30Days: newUsers, teachers },
      courses: {
        pending: courseCount(CourseStatusEnum.PENDING),
        validated: courseCount(CourseStatusEnum.VALIDATED),
        rejected: courseCount(CourseStatusEnum.REJECTED),
      },
      mentoring: { confirmedCalls: bookings },
      topCourses: topCourses.map((course) => ({
        id: course._id,
        title: course.title,
        sales: course.sales,
        revenue: Math.round(course.revenue * 100) / 100,
      })),
      salesByDay: salesByDay.map((day) => ({
        date: day._id,
        revenue: Math.round(day.revenue * 100) / 100,
        orders: day.orders,
      })),
    };
  }
}

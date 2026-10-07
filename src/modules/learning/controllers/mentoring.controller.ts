import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse } from '@nestjs/swagger';
import { OptionalAuthGuard } from '../../../common/guards/optional-auth.guard';
import { BookedSlotsQuery } from '../dtos/bookings/booked-slots-query.dto';
import { BookingsService } from '../services/bookings.service';
import {
  IBookingInformation,
  MentorBookingNotificationService,
} from '../services/mentor-booking-notification.service';

@Controller('/mentoring')
export class MentoringController {
  constructor(
    private mentorBookingNotificationService: MentorBookingNotificationService,
    private bookingsService: BookingsService,
  ) {}

  @Post()
  @ApiExcludeEndpoint()
  async sendMail(@Body() bookingInformation: IBookingInformation) {
    await this.mentorBookingNotificationService.send(bookingInformation);
  }

  @Get('booked-slots/:teacherId')
  @UseGuards(OptionalAuthGuard)
  @ApiOkResponse({
    description: 'Times already booked for this mentor on the given date.',
  })
  async bookedSlots(
    @Param('teacherId') teacherId: string,
    @Query() query: BookedSlotsQuery,
    @Req() req: any,
  ): Promise<string[]> {
    return this.bookingsService.getTakenTimes(
      teacherId,
      query.date,
      req.user?.id,
    );
  }
}

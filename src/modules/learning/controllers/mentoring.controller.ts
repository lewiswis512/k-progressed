import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { BookedSlotsQuery } from '../dtos/bookings/booked-slots-query.dto';
import { Booking } from '../schemas/booking.schema';
import { BookingsService } from '../services/bookings.service';
import { AuthenticatedRequest } from '../../../common/auth/authenticated-request';

@Controller('/mentoring')
export class MentoringController {
  constructor(private bookingsService: BookingsService) {}

  @Get('booked-slots/:teacherId')
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'Times already booked for this mentor on the given date.',
  })
  async bookedSlots(
    @Param('teacherId') teacherId: string,
    @Query() query: BookedSlotsQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<string[]> {
    return this.bookingsService.getTakenTimes(
      teacherId,
      query.date,
      req.user?.id,
    );
  }

  @Get('available-slots/:teacherId')
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description:
      'Start times (Paris time) still bookable for this mentor on the given date.',
  })
  async availableSlots(
    @Param('teacherId') teacherId: string,
    @Query() query: BookedSlotsQuery,
    @Req() req: AuthenticatedRequest,
  ): Promise<string[]> {
    return this.bookingsService.getAvailableTimes(
      teacherId,
      query.date,
      req.user?.id,
    );
  }

  @Get('bookings')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'Mentoring calls booked by the current user.' })
  async myBookings(@Req() req: AuthenticatedRequest): Promise<Booking[]> {
    return this.bookingsService.listForBooker(req.user.id);
  }

  @Get('bookings/teaching')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'Mentoring calls booked with the current mentor.',
  })
  async teachingBookings(@Req() req: AuthenticatedRequest): Promise<Booking[]> {
    return this.bookingsService.listForTeacher(req.user.id);
  }

  @Post('bookings/:id/cancel')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({ description: 'The call has been cancelled and refunded.' })
  async cancel(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Booking> {
    return this.bookingsService.cancel(id, req.user);
  }
}

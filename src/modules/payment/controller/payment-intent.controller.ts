import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentService } from '../service/payment.service';
import { ApiExcludeController } from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { CreateMentoringPaymentIntent } from '../dto/create-mentoring-payment-intent.dto';

@ApiExcludeController()
@Controller('payment-intent')
export class PaymentIntentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create')
  async create(@Body() data: any) {
    return await this.paymentService.createPaymentIntent(data);
  }

  @Post('mentoring')
  @UseGuards(AuthGuard)
  async createMentoring(
    @Req() req: any,
    @Body() booking: CreateMentoringPaymentIntent,
  ) {
    return await this.paymentService.createMentoringPaymentIntent(
      booking,
      req.user,
    );
  }
}

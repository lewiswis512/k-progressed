import { Body, Controller, Post } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { SavePaymentDto } from '../dto/save-payment.dto';
import { PaymentService } from '../service/payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @ApiExcludeEndpoint()
  @Post('create')
  async savePaymentDetail(@Body() savePaymentDto: SavePaymentDto) {
    await this.paymentService.savePaymentInformation(savePaymentDto.purchaseId);
  }
}

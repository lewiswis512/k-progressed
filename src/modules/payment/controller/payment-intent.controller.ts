import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { CreateMentoringPaymentIntent } from '../dto/create-mentoring-payment-intent.dto';
import { PaymentService } from '../service/payment.service';
import { AuthenticatedRequest } from '../../../common/auth/authenticated-request';

@ApiExcludeController()
@Controller('payment-intent')
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
export class PaymentIntentController {
  constructor(private paymentService: PaymentService) {}

  @Post('purchase/:purchaseId')
  async createForPurchase(
    @Param('purchaseId') purchaseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.paymentService.createPurchasePaymentIntent(
      purchaseId,
      req.user,
    );
  }

  @Post('mentoring')
  async createMentoring(
    @Req() req: AuthenticatedRequest,
    @Body() booking: CreateMentoringPaymentIntent,
  ) {
    return await this.paymentService.createMentoringPaymentIntent(
      booking,
      req.user,
    );
  }

  @Post('refund/purchase/:purchaseId')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  async refundPurchase(@Param('purchaseId') purchaseId: string) {
    return await this.paymentService.refundPurchase(purchaseId);
  }
}

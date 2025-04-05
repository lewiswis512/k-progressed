import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { StripeService } from '../../modules/payment/service/stripe.service';
import { SavePurchase } from './dto/save-purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController extends StripeService {
  constructor(private purchaseService: PurchasesService) {
    super();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async list() {
    return await this.purchaseService.findAll();
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async show(@Param('id') id: string) {
    return await this.purchaseService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async add(@Body() savePurchaseDto: SavePurchase) {
    return await this.purchaseService.store(savePurchaseDto);
  }

  @Patch(':id/validate')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async validatePurchase(@Param('id') id: string) {
    return await this.purchaseService.validatePurchase(id);
  }
}

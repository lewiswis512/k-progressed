import { Controller, Get, InternalServerErrorException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

@Controller('config')
@ApiExcludeController()
export class ConfigController {
  @Get()
  getPublishableKey() {
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      throw new InternalServerErrorException('Publishable key not found');
    }

    return { publishable_key: publishableKey };
  }
}

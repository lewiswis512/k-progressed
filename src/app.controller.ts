import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiExcludeController } from '@nestjs/swagger';
import { UserRepository } from './modules/users/repository/user.repository';

@Controller()
@ApiExcludeController()
@SkipThrottle()
export class AppController {
  constructor(private readonly userRepository: UserRepository) {}

  @Get('health')
  health(): { status: string; database: string } {
    return {
      status: 'ok',
      database: this.userRepository.isDatabaseUp() ? 'up' : 'down',
    };
  }
}

import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from '../users.service';
import { ApiExcludeController } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiExcludeController()
@Controller()
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class CheckingController {
  public constructor(private usersService: UsersService) {}

  @Get('check-username/:usr_username')
  async checkUsername(@Param('usr_username') usr_username: string) {
    return await this.usersService.isAlreadySaved(
      'users',
      'usr_username',
      usr_username,
    );
  }

  @Get('check-email/:usr_email')
  async checkEmail(@Param('usr_email') usr_email: string) {
    return await this.usersService.isAlreadySaved(
      'users',
      'usr_email',
      usr_email,
    );
  }
}

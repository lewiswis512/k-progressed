import { Module } from '@nestjs/common';
import { UserSeeder } from './seeds/user.seed';
import { UsersService } from '../modules/users/users.service';
import { UserRepository } from '../modules/users/repository/user.repository';

@Module({
  providers: [UserSeeder, UsersService, UserRepository],
  exports: [UserSeeder],
})
export class DatabaseModule {}

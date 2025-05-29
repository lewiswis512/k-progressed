import { Injectable, Logger } from '@nestjs/common';
import { UserFactory } from '../factories/user.factory';
import { AuthService } from '../../modules/auth/services/auth.service';

@Injectable()
export class UserSeeder {
  private readonly logger = new Logger(UserSeeder.name);

  async seed(count: number = 10): Promise<void> {
    this.logger.log(`Seeding ${count} users...`);

    for (let i = 0; i < count; i++) {
      console.log('i ' + i);
    }

    this.logger.log('User Seeding complete');
  }
}

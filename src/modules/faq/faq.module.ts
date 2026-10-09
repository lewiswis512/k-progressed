import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { FaqController } from './controllers/faq.controller';
import { FaqRepository } from './repositories/faq.repository';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { FaqService } from './services/faq.service';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserRepository } from '../users/repository/user.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Faq.name, schema: FaqSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FaqController],
  providers: [FaqService, FaqRepository, UserRepository],
  exports: [FaqRepository],
})
export class FaqModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { FaqController } from './controllers/faq.controller';
import { FaqRepository } from './repositories/faq.repository';
import { Faq, FaqSchema } from './schemas/faq.schema';
import { FaqService } from './services/faq.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: Faq.name, schema: FaqSchema }]),
  ],
  controllers: [FaqController],
  providers: [FaqService, FaqRepository],
  exports: [FaqRepository],
})
export class FaqModule {}

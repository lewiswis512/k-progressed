import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchaseRepository } from '../../../modules/purchases/repository/purchase.repository';
import {
  Purchase,
  PurchaseSchema,
} from '../../../modules/purchases/schemas/purchase.schema';
import { LearningController } from '../controllers/learning.controller';
import { LearningService } from '../services/learning.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  controllers: [LearningController],
  providers: [LearningService, PurchaseRepository],
})
export class LearningModule {}

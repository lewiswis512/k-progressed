import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseRepository } from './repository/purchase.repository';
import { Purchase, PurchaseSchema } from './schemas/purchase.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
    ]),
  ],
  providers: [PurchasesService, PurchaseRepository],
  controllers: [PurchasesController],
})
export class PurchasesModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { PurchaseRepository } from './repository/purchase.repository';
import { Purchase, PurchaseSchema } from './schemas/purchase.schema';
import { AuthModule } from '../auth/auth.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UserRepository } from '../users/repository/user.repository';
import { Course, CourseSchema } from '../learning/schemas/course.schema';
import { CourseRepository } from '../learning/repositories/course.repository';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Purchase.name, schema: PurchaseSchema },
      { name: User.name, schema: UserSchema },
      { name: Course.name, schema: CourseSchema },
    ]),
  ],
  providers: [
    PurchasesService,
    PurchaseRepository,
    UserRepository,
    CourseRepository,
  ],
  controllers: [PurchasesController],
  exports: [PurchasesService, PurchaseRepository],
})
export class PurchasesModule {}

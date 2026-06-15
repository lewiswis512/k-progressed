import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoRepository } from '../../common/repository/mongo.repository';
import { CloudinaryUploadStrategy } from '../../utils/uploads/cloudinary-upload-strategy';
import {
  StripeCustomer,
  StripeCustomerSchema,
} from '../payment/schemas/stripe-customer.schema';
import { CheckingController } from './controllers/checking.controller';
import { StripeCustomerRepository } from './repository/stripe-customer.repository';
import { UserResetRepository } from './repository/user-reset.repository';
import { UserRepository } from './repository/user.repository';
import { UserReset, UserResetSchema } from './schemas/user-reset.schema';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserReset.name, schema: UserResetSchema },
      { name: StripeCustomer.name, schema: StripeCustomerSchema },
    ]),
  ],
  providers: [
    UsersService,
    UserRepository,
    UserResetRepository,
    StripeCustomerRepository,
    CloudinaryUploadStrategy,
    MongoRepository,
  ],
  exports: [UsersService, StripeCustomerRepository, UserRepository],
  controllers: [UsersController, CheckingController],
})
export class UsersModule {}

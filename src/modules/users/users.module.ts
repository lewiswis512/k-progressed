import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UserReset, UserResetSchema } from './schemas/user-reset.schema';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserResetRepository } from './repository/user-reset.repository';
import { UserRepository } from './repository/user.repository';
import { CloudinaryUploadStrategy } from '../../utils/uploads/cloudinary-upload-strategy';
import { MongoRepository } from '../../common/repository/mongo.repository';
import { CheckingController } from './controllers/checking.controller';
import { StripeCustomerRepository } from './repository/stripe-customer.repository';
import {
  StripeCustomer,
  StripeCustomerSchema,
} from '../payment/schemas/stripe-customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserReset.name, schema: UserResetSchema },
      { name: StripeCustomer.name, schema: StripeCustomerSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: async () => ({
        global: true,
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION_TIME },
      }),
    }),
  ],
  providers: [
    UsersService,
    UserRepository,
    UserResetRepository,
    StripeCustomerRepository,
    CloudinaryUploadStrategy,
    MongoRepository,
  ],
  exports: [MongooseModule, UsersService, StripeCustomerRepository],
  controllers: [UsersController, CheckingController],
})
export class UsersModule {}

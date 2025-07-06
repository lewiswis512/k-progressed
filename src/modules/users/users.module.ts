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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserReset.name, schema: UserResetSchema },
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
    CloudinaryUploadStrategy,
    MongoRepository,
  ],
  exports: [UsersService],
  controllers: [UsersController, CheckingController],
})
export class UsersModule {}

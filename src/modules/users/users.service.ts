import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { IUserUpdateProfile } from '../../interfaces/users/IUserUpdateProfile';
import { hashPassword } from '../../utils/auths/hashPassword';
import { UserResetRepository } from './repository/user-reset.repository';
import { UserRepository } from './repository/user.repository';
import { UserReset } from './schemas/user-reset.schema';
import { User } from './schemas/user.schema';
import { UpdateProfile } from './dto/update-profile.dto';
import { PhotoUploaderContext } from '../../utils/uploads/photo-uploader-context';
import { CloudinaryUploadStrategy } from '../../utils/uploads/cloudinary';
import { PATH_USERS_CLOUDINARY } from '../../utils/constants/uploads/path-upload';
import { MongoRepository } from '../../common/repository/mongo.repository';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    private userResetRepository: UserResetRepository,
    private cloudinaryUploadStrategy: CloudinaryUploadStrategy,
    private MongoRepository: MongoRepository,
  ) {}

  async findAll() {
    return this.userRepository.find();
  }

  async changePassword(id: Types.ObjectId, password: string): Promise<User> {
    return this.userRepository.findByIdAndUpdate(id, {
      usr_password: await hashPassword(password),
    });
  }

  async updateProfile(
    id: Types.ObjectId,
    updateProfileDto: UpdateProfile,
    file: Express.Multer.File,
  ): Promise<IUserUpdateProfile> {
    const user: User = await this.userRepository.findById(
      new Types.ObjectId(id),
    );

    let data: Partial<IUserUpdateProfile> = {
      ...updateProfileDto,
    };

    let photoLink: string;

    if (file === undefined) {
      photoLink = user.usr_photo;
    } else {
      if (user.usr_photo) {
        const publicId = this.cloudinaryUploadStrategy.getPublicIdFromUrl(
          user.usr_photo,
        );

        await this.cloudinaryUploadStrategy.delete(publicId);
      }

      const cloudinaryContext = new PhotoUploaderContext(
        new CloudinaryUploadStrategy(),
      );
      photoLink = await cloudinaryContext.upload(
        file.buffer,
        PATH_USERS_CLOUDINARY,
      );
    }

    if (photoLink) {
      data = { ...data, usr_photo: photoLink };
    } else {
      data = { ...data, usr_photo: null };
    }

    const userUpdated = await this.userRepository.findByIdAndUpdate(id, data);

    return {
      _id: userUpdated._id,
      usr_username: userUpdated.usr_username,
      usr_email: userUpdated.usr_email,
      usr_registered_date: userUpdated.usr_registered_date,
      usr_type: userUpdated.usr_type,
      usr_firstname: userUpdated.usr_firstname,
      usr_lastname: userUpdated.usr_lastname,
      usr_photo: userUpdated.usr_photo ?? null,
    };
  }

  async checkEmailTokenForgetPassword(
    email: string,
    token: string,
  ): Promise<UserReset> {
    return this.userResetRepository.findOne({
      usr_rest_email: email,
      usr_rest_token: token,
    });
  }

  async deleteEmailTokenForgetPassword(
    email: string,
    token: string,
  ): Promise<void> {
    this.userResetRepository.findOneAndDelete({
      usr_rest_email: email,
      usr_rest_token: token,
    });
  }

  async isAlreadySaved(collectionName: string, field: string, value: string) {
    return await this.MongoRepository.exists(collectionName, field, value);
  }
}

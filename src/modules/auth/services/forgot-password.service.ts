import {
  GoneException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Response } from 'express';
import { ForgotPassword } from '../dto/forgot-password.dto';
import { UserReset } from '../../../modules/users/schemas/user-reset.schema';
import { User } from '../../../modules/users/schemas/user.schema';
import { formatDateTime } from '../../../utils/dates/format-datetime';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { UserResetRepository } from '../../../modules/users/repository/user-reset.repository';
import { hashPassword } from '../../../utils/auths/hashPassword';

@Injectable()
export class ForgotPasswordService {
  public constructor(
    private userRepository: UserRepository,
    private userResetRepository: UserResetRepository,
  ) {}

  async forgotPassword(
    token: string,
    forgotPasswordDto: ForgotPassword,
    res: Response,
  ): Promise<Response> {
    const { email, password } = forgotPasswordDto;
    const isTokenValid: UserReset = await this.checkTokenValidity(email, token);
    const user: User = await this.userRepository.findOne({ usr_email: email });

    this.checkTokenExpiration(isTokenValid.usr_rest_expired_at);

    await this.userRepository.findByIdAndUpdate(user._id, {
      usr_password: await hashPassword(password),
    });
    await this.userResetRepository.findOneAndDelete({
      usr_rest_email: email,
      usr_rest_token: token,
    });

    return res.status(200).json({ status: 'success' });
  }

  async checkTokenValidity(email: string, token: string) {
    const isTokenValid = await this.userResetRepository.findOne({
      usr_rest_email: email,
      usr_rest_token: token,
    });

    if (isTokenValid === null) {
      throw new InternalServerErrorException('Token may be not valid');
    }

    return isTokenValid;
  }

  checkTokenExpiration(usr_rest_expired_at: Date) {
    if (formatDateTime(new Date()) > formatDateTime(usr_rest_expired_at)) {
      throw new GoneException('the reset token has expired');
    }
  }
}

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
import { UsersService } from '../../../modules/users/users.service';

@Injectable()
export class ForgotPasswordService {
  public constructor(
    private userRepository: UserRepository,
    private usersService: UsersService,
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

    await this.usersService.changePassword(user._id, password);
    await this.usersService.deleteEmailTokenForgetPassword(email, token);

    return res.status(200).json({ status: 'success' });
  }

  async checkTokenValidity(email: string, token: string) {
    const isTokenValid = await this.usersService.checkEmailTokenForgetPassword(
      email,
      token,
    );

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

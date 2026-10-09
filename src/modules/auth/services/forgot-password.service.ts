import { BadRequestException, Injectable } from '@nestjs/common';
import { ForgotPassword } from '../dto/forgot-password.dto';
import { UserRepository } from '../../../modules/users/repository/user.repository';
import { UserResetRepository } from '../../../modules/users/repository/user-reset.repository';
import { UserTokenTypeEnum } from '../../../modules/users/schemas/user-reset.schema';
import { hashPassword } from '../../../utils/auths/hashPassword';
import { hashToken } from '../../../utils/randoms/generateToken';
import { SessionService } from './session.service';

@Injectable()
export class ForgotPasswordService {
  public constructor(
    private userRepository: UserRepository,
    private userResetRepository: UserResetRepository,
    private sessionService: SessionService,
  ) {}

  async forgotPassword(
    token: string,
    forgotPasswordDto: ForgotPassword,
  ): Promise<{ status: string }> {
    const userToken = await this.userResetRepository.findOneOrNull({
      usr_rest_token: hashToken(token),
      usr_rest_type: UserTokenTypeEnum.RESET_PASSWORD,
      usr_rest_expired_at: { $gt: new Date() },
    });

    if (!userToken) {
      throw new BadRequestException(
        'This reset link is invalid or has expired',
      );
    }

    const user = await this.userRepository.findOneAndUpdate(
      { usr_email: userToken.usr_rest_email },
      {
        usr_password: await hashPassword(forgotPasswordDto.password),
        usr_password_changed_at: new Date(),
        usr_email_verified: true,
        $inc: { usr_token_version: 1 },
      },
    );

    await this.userResetRepository.deleteMany({
      usr_rest_email: userToken.usr_rest_email,
      usr_rest_type: UserTokenTypeEnum.RESET_PASSWORD,
    });

    if (!user) {
      throw new BadRequestException(
        'This reset link is invalid or has expired',
      );
    }

    await this.sessionService.revokeAll(user._id);

    return { status: 'success' };
  }
}

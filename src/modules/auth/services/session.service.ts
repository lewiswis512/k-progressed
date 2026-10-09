import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import {
  REFRESH_TOKEN_TTL_MS,
  expiresIn,
} from '../../../utils/constants/token/token-expiration';
import { generateToken, hashToken } from '../../../utils/randoms/generateToken';
import { UserRepository } from '../../users/repository/user.repository';
import { User } from '../../users/schemas/user.schema';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

export interface ISession {
  accessToken: string;
  refreshToken: string;
}

const SESSION_EXPIRED_MESSAGE = 'Your session has expired, please log in again';

@Injectable()
export class SessionService {
  constructor(
    private jwtService: JwtService,
    private userRepository: UserRepository,
    private refreshTokenRepository: RefreshTokenRepository,
  ) {}

  async createAccessToken(user: User): Promise<string> {
    const payload = {
      id: user._id,
      username: user.usr_username,
      email: user.usr_email,
      firstname: user.usr_firstname,
      lastname: user.usr_lastname,
      slug: user.usr_slug,
      photo: user.usr_photo,
      type: user.usr_type,
      role: user.usr_role,
      customerId: user.stripe_customer_id,
      tv: user.usr_token_version ?? 0,
    };

    return this.jwtService.signAsync(payload);
  }

  async create(user: User): Promise<ISession> {
    const refreshToken = generateToken(48);

    await this.refreshTokenRepository.create({
      rfsh_user: user,
      rfsh_token: hashToken(refreshToken),
      rfsh_expired_at: expiresIn(REFRESH_TOKEN_TTL_MS),
    });

    return { accessToken: await this.createAccessToken(user), refreshToken };
  }

  async refresh(refreshToken: string): Promise<ISession> {
    const tokenHash = hashToken(refreshToken);
    const now = new Date();
    const stored = await this.refreshTokenRepository.findOneAndUpdate(
      {
        rfsh_token: tokenHash,
        rfsh_used_at: { $exists: false },
        rfsh_expired_at: { $gt: now },
      },
      { rfsh_used_at: now },
    );

    if (!stored) {
      const reused = await this.refreshTokenRepository.findOneOrNull({
        rfsh_token: tokenHash,
      });

      if (reused) {
        await this.revokeAll(reused.rfsh_user._id);
      }

      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }

    const user = await this.userRepository.findOneOrNull({
      _id: stored.rfsh_user._id,
    });

    if (!user || user.usr_email_verified === false) {
      await this.revokeAll(stored.rfsh_user._id);

      throw new UnauthorizedException(SESSION_EXPIRED_MESSAGE);
    }

    return this.create(user);
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.findOneAndDelete({
      rfsh_token: hashToken(refreshToken),
    });
  }

  async revokeAll(userId: Types.ObjectId | string): Promise<void> {
    await this.refreshTokenRepository.deleteMany({
      rfsh_user: new Types.ObjectId(String(userId)),
    });
  }
}

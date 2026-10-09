import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import { UserRepository } from '../../modules/users/repository/user.repository';
import { AuthenticatedRequest } from '../auth/authenticated-request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token not found');
    }

    const payload = await this.jwtService
      .verifyAsync<{ id: string; tv?: number }>(token, {
        secret: process.env.JWT_SECRET,
      })
      .catch((): null => null);
    const user = Types.ObjectId.isValid(payload?.id)
      ? await this.userRepository.findSessionUser(
          new Types.ObjectId(payload.id),
        )
      : null;

    if (!user || (payload.tv ?? 0) !== (user.usr_token_version ?? 0)) {
      throw new UnauthorizedException('Not authorized');
    }

    request.user = {
      id: String(user._id),
      username: user.usr_username,
      email: user.usr_email,
      firstname: user.usr_firstname,
      lastname: user.usr_lastname,
      slug: user.usr_slug,
      photo: user.usr_photo,
      type: user.usr_type,
      role: user.usr_role,
      customerId: user.stripe_customer_id,
    };

    return true;
  }
}

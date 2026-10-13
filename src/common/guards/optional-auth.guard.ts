import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from '../auth/authenticated-request';
import { AuthGuard } from './auth.guard';

@Injectable()
export class OptionalAuthGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.headers.authorization) {
      return true;
    }

    return super.canActivate(context);
  }
}

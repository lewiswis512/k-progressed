import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './services/auth.service';
import { ForgotPassword } from './dto/forgot-password.dto';
import { Registration } from './dto/registration.dto';
import { ResendVerification } from './dto/resend-verification.dto';
import { ResetPassword } from './dto/reset-password.dto';
import { SignIn } from './dto/singIn.dto';
import { ForgotPasswordService } from './services/forgot-password.service';
import { RefreshSession } from './dto/refresh-session.dto';
import { ISession, SessionService } from './services/session.service';

const AUTH_THROTTLE = { default: { limit: 5, ttl: 60000 } };

@Controller('')
export class AuthController {
  constructor(
    private authService: AuthService,
    private forgotPasswordService: ForgotPasswordService,
    private sessionService: SessionService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  signIn(@Body() signInDto: SignIn): Promise<ISession> {
    return this.authService.singIn(signInDto);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  refreshToken(@Body() { refreshToken }: RefreshSession): Promise<ISession> {
    return this.sessionService.refresh(refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() { refreshToken }: RefreshSession): Promise<void> {
    await this.sessionService.revoke(refreshToken);
  }

  @Post('signup')
  @Throttle(AUTH_THROTTLE)
  signUp(@Body() registerDto: Registration): Promise<{ message: string }> {
    return this.authService.signUp(registerDto);
  }

  @Post('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Param('token') token: string): Promise<ISession> {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  resendVerification(
    @Body() { email }: ResendVerification,
  ): Promise<{ message: string }> {
    return this.authService.resendVerification(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  resetPassword(
    @Body() { email }: ResetPassword,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(email);
  }

  @Post('forgot-password/:token')
  @HttpCode(HttpStatus.OK)
  @Throttle(AUTH_THROTTLE)
  forgotPassword(
    @Param('token') token: string,
    @Body() forgotPasswordDto: ForgotPassword,
  ): Promise<{ status: string }> {
    return this.forgotPasswordService.forgotPassword(token, forgotPasswordDto);
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { ForgotPasswordService } from 'src/modules/auth/services/forgot-password.service';
import { SessionService } from 'src/modules/auth/services/session.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: {
    singIn: jest.Mock;
    signUp: jest.Mock;
    verifyEmail: jest.Mock;
    resendVerification: jest.Mock;
    resetPassword: jest.Mock;
  };
  let forgotPasswordService: { forgotPassword: jest.Mock };
  let sessionService: { refresh: jest.Mock; revoke: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            singIn: jest.fn(),
            signUp: jest.fn(),
            verifyEmail: jest.fn(),
            resendVerification: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
        {
          provide: ForgotPasswordService,
          useValue: { forgotPassword: jest.fn() },
        },
        {
          provide: SessionService,
          useValue: { refresh: jest.fn(), revoke: jest.fn() },
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    forgotPasswordService = module.get(ForgotPasswordService);
    sessionService = module.get(SessionService);
  });

  it('should rotate the session with the refresh token', async () => {
    const session = { accessToken: 'new-access', refreshToken: 'new-refresh' };
    sessionService.refresh.mockResolvedValue(session);

    const result = await authController.refreshToken({
      refreshToken: 'old-refresh',
    });

    expect(sessionService.refresh).toHaveBeenCalledWith('old-refresh');
    expect(result).toEqual(session);
  });

  it('should revoke the refresh token on logout', async () => {
    sessionService.revoke.mockResolvedValue(undefined);

    await authController.logout({ refreshToken: 'refresh-token' });

    expect(sessionService.revoke).toHaveBeenCalledWith('refresh-token');
  });

  it('should return the access token when credentials are valid', async () => {
    const signInDto = {
      usr_email: 'john@test.local',
      usr_password: 'Password123',
    };
    authService.singIn.mockResolvedValue({ accessToken: 'jwt-token-123' });

    const result = await authController.signIn(signInDto);

    expect(authService.singIn).toHaveBeenCalledWith(signInDto);
    expect(result).toEqual({ accessToken: 'jwt-token-123' });
  });

  it('should delegate the signup and only return its message', async () => {
    const registration = {
      usr_username: 'john',
      usr_email: 'john@test.local',
      usr_password: 'Password123',
      acceptTerms: true,
    };
    authService.signUp.mockResolvedValue({ message: 'Check your inbox' });

    await expect(authController.signUp(registration)).resolves.toEqual({
      message: 'Check your inbox',
    });
    expect(authService.signUp).toHaveBeenCalledWith(registration);
  });

  it('should verify the email with the token of the link', async () => {
    authService.verifyEmail.mockResolvedValue({ accessToken: 'jwt' });

    await expect(authController.verifyEmail('abc')).resolves.toEqual({
      accessToken: 'jwt',
    });
    expect(authService.verifyEmail).toHaveBeenCalledWith('abc');
  });

  it('should only pass the email to the reset password service', async () => {
    authService.resetPassword.mockResolvedValue({ message: 'generic' });

    await authController.resetPassword({ email: 'john@test.local' });

    expect(authService.resetPassword).toHaveBeenCalledWith('john@test.local');
  });

  it('should only pass the email to the resend verification service', async () => {
    authService.resendVerification.mockResolvedValue({ message: 'generic' });

    await authController.resendVerification({ email: 'john@test.local' });

    expect(authService.resendVerification).toHaveBeenCalledWith(
      'john@test.local',
    );
  });

  it('should reset the password with the token and the new password', async () => {
    const body = { password: 'NewPassword1', confirmPassword: 'NewPassword1' };
    forgotPasswordService.forgotPassword.mockResolvedValue({
      status: 'success',
    });

    await expect(authController.forgotPassword('token', body)).resolves.toEqual(
      {
        status: 'success',
      },
    );
    expect(forgotPasswordService.forgotPassword).toHaveBeenCalledWith(
      'token',
      body,
    );
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from 'src/modules/auth/auth.controller';
import { AuthService } from 'src/modules/auth/services/auth.service';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: { signIn: jest.Mock };

  beforeEach(async () => {
    const mockAuthService = {
      signIn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('should return access_token when credentials are valid', async () => {
    const signInDto = {
      usr_email: 'rabarilewis@gmail.com',
      usr_password: 'password',
    };
    const mockToken = { access_token: 'jwt-token-123' };

    jest.spyOn(authService, 'signIn').mockResolvedValue(mockToken);

    const result = await authController.signIn(signInDto);

    expect(authService.signIn).toHaveBeenCalledWith(signInDto);
    expect(result).toEqual(mockToken);
  });
});

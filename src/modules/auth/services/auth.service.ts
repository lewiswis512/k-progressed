import { MailerService } from '@nestjs-modules/mailer';
import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { IRegistration } from '../../../interfaces/users/IRegistration';
import { StripeCustomer } from '../../payment/schemas/stripe-customer.schema';
import { UserResetRepository } from '../../users/repository/user-reset.repository';
import { UserRepository } from '../../users/repository/user.repository';
import { resetPasswordTemplate } from '../../../templates/reset-password';
import { verifyEmailTemplate } from '../../../templates/verify-email';
import { hashPassword } from '../../../utils/auths/hashPassword';
import { validatePassword } from '../../../utils/auths/validatePassword';
import {
  SUBJECT_RESET_PASSWORD,
  SUBJECT_VERIFY_EMAIL,
} from '../../../utils/constants/mailing/email';
import {
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
  RESET_PASSWORD_TOKEN_TTL_MS,
  expiresIn,
} from '../../../utils/constants/token/token-expiration';
import { generateToken, hashToken } from '../../../utils/randoms/generateToken';
import { UserTokenTypeEnum } from '../../users/schemas/user-reset.schema';
import { User } from '../../users/schemas/user.schema';
import { Registration } from '../dto/registration.dto';
import { SignIn } from '../dto/singIn.dto';
import { StripeCustomerService } from '../stripe-customer.service';
import { ISession, SessionService } from './session.service';
import { errorStack } from '../../../utils/errors';

const GENERIC_RESET_MESSAGE =
  'If an account exists for this email, a reset link has been sent.';
const GENERIC_VERIFICATION_MESSAGE =
  'If this account still needs to be confirmed, a new confirmation link has been sent.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private mailerService: MailerService,
    private readonly userRepository: UserRepository,
    private readonly userResetRepository: UserResetRepository,
    private stripeCustomerService: StripeCustomerService,
    private sessionService: SessionService,
  ) {}

  async singIn(signInDto: SignIn): Promise<ISession> {
    const user: User | null = await this.userRepository.findOneWithPassword(
      this.userRepository.emailFilter(signInDto.usr_email),
    );

    const isValidPassword: boolean =
      !!user?.usr_password &&
      (await validatePassword(signInDto.usr_password, user.usr_password));

    if (!user || !isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.usr_email_verified === false) {
      throw new ForbiddenException(
        'Please confirm your email address before logging in',
      );
    }

    return this.sessionService.create(user);
  }

  async signUp(registerDto: Registration): Promise<{ message: string }> {
    const hashedPassword: string = await hashPassword(registerDto.usr_password);
    const data: IRegistration = {
      usr_username: registerDto.usr_username.trim(),
      usr_email: registerDto.usr_email.toLowerCase().trim(),
      usr_slug: '',
      usr_password: hashedPassword,
      usr_email_verified: false,
    };
    const user: User = await this.userRepository.create(data);

    await this.attachCustomerIdToUser(user);
    await this.sendVerificationEmail(user);

    return {
      message:
        'Your account has been created. Check your inbox to confirm your email address.',
    };
  }

  async createCustomerStripe(user: User) {
    let customerId: string | null = null;

    try {
      const stripeCustomer: StripeCustomer =
        await this.stripeCustomerService.createCustomer(
          user.usr_username,
          user.usr_email,
        );
      customerId = stripeCustomer.customer_id;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create the Stripe customer',
        errorStack(error),
      );
    }

    return customerId;
  }

  async attachCustomerIdToUser(user: User) {
    const stripeCustomerId: string | null =
      await this.createCustomerStripe(user);

    return this.userRepository.findByIdAndUpdate(user._id, {
      stripe_customer_id: stripeCustomerId,
    });
  }

  async sendVerificationEmail(user: User): Promise<void> {
    const token: string = generateToken();

    await this.userResetRepository.deleteMany({
      usr_rest_email: user.usr_email,
      usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
    });
    await this.userResetRepository.create({
      usr_rest_email: user.usr_email,
      usr_rest_token: hashToken(token),
      usr_rest_expired_at: expiresIn(EMAIL_VERIFICATION_TOKEN_TTL_MS),
      usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
    });

    const verificationLink = `${process.env.FRONTEND_URL}/verify-email/${token}`;

    try {
      await this.mailerService.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.usr_email,
        subject: SUBJECT_VERIFY_EMAIL,
        html: verifyEmailTemplate(user, verificationLink),
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to send the verification email',
        errorStack(error),
      );
    }
  }

  async resendVerification(email: string): Promise<{ message: string }> {
    const user: User | null = await this.userRepository.findOneOrNull(
      this.userRepository.emailFilter(email),
    );

    if (user && user.usr_email_verified === false) {
      await this.sendVerificationEmail(user);
    }

    return { message: GENERIC_VERIFICATION_MESSAGE };
  }

  async verifyEmail(token: string): Promise<ISession> {
    const userToken = await this.userResetRepository.findOneOrNull({
      usr_rest_token: hashToken(token),
      usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
      usr_rest_expired_at: { $gt: new Date() },
    });

    if (!userToken) {
      throw new ForbiddenException(
        'This confirmation link is invalid or has expired',
      );
    }

    const user: User | null = await this.userRepository.findOneAndUpdate(
      { usr_email: userToken.usr_rest_email },
      { usr_email_verified: true },
    );

    await this.userResetRepository.deleteMany({
      usr_rest_email: userToken.usr_rest_email,
      usr_rest_type: UserTokenTypeEnum.VERIFY_EMAIL,
    });

    if (!user) {
      throw new ForbiddenException(
        'This confirmation link is invalid or has expired',
      );
    }

    return this.sessionService.create(user);
  }

  async resetPassword(email: string): Promise<{ message: string }> {
    const user: User | null = await this.userRepository.findOneOrNull(
      this.userRepository.emailFilter(email),
    );

    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    const normalizedEmail = user.usr_email;

    const token: string = generateToken();

    await this.userResetRepository.deleteMany({
      usr_rest_email: normalizedEmail,
      usr_rest_type: UserTokenTypeEnum.RESET_PASSWORD,
    });
    await this.userResetRepository.create({
      usr_rest_email: normalizedEmail,
      usr_rest_token: hashToken(token),
      usr_rest_expired_at: expiresIn(RESET_PASSWORD_TOKEN_TTL_MS),
      usr_rest_type: UserTokenTypeEnum.RESET_PASSWORD,
    });

    const forgotPasswordLink: string = `${process.env.FORGOT_PASSWORD_LINK}/${token}`;

    try {
      await this.mailerService.sendMail({
        from: process.env.EMAIL_FROM,
        to: normalizedEmail,
        subject: SUBJECT_RESET_PASSWORD,
        html: resetPasswordTemplate(user, forgotPasswordLink),
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to send the reset password email',
        errorStack(error),
      );
    }

    return { message: GENERIC_RESET_MESSAGE };
  }
}

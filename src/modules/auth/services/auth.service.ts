import { MailerService } from '@nestjs-modules/mailer';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IRegistration } from '../../../interfaces/users/IRegistration';
import { StripeCustomer } from '../../payment/schemas/stripe-customer.schema';
import { UserResetRepository } from '../../users/repository/user-reset.repository';
import { UserRepository } from '../../users/repository/user.repository';
import { resetPasswordTemplate } from '../../../templates/reset-password';
import { hashPassword } from '../../../utils/auths/hashPassword';
import { validatePassword } from '../../../utils/auths/validatePassword';
import { SUBJECT_RESET_PASSWORD } from '../../../utils/constants/mailing/email';
import { TOKEN_AUTH_EXPIRED_AT } from '../../../utils/constants/token/token-expiration';
import { generateToken } from '../../../utils/randoms/generateToken';
import { UserReset } from '../../users/schemas/user-reset.schema';
import { User } from '../../users/schemas/user.schema';
import { Registration } from '../dto/registration.dto';
import { SignIn } from '../dto/singIn.dto';
import { StripeCustomerService } from '../stripe-customer.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private mailerService: MailerService,
    private readonly userRepository: UserRepository,
    private readonly userResetRepository: UserResetRepository,
    private stripeCustomerService: StripeCustomerService,
  ) {}

  async singIn(signInDto: SignIn): Promise<{ accessToken: string }> {
    const user: User = await this.userRepository.findOne({
      usr_email: signInDto.usr_email,
    });

    const isValidPassword: boolean = await validatePassword(
      signInDto.usr_password,
      user?.usr_password,
    );

    if (!user || !isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

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
    };

    const accessToken: string = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  async signUp(registerDto: Registration): Promise<User> {
    const hashedPassword: string = await hashPassword(registerDto.usr_password);
    const data: IRegistration = {
      ...registerDto,
      usr_slug: '',
      usr_password: hashedPassword,
    };
    const user: User = await this.userRepository.create(data);

    return await this.attachCustomerIdToUser(user);
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
    } catch (error: any) {
      console.error(error);
    }

    return customerId;
  }

  async attachCustomerIdToUser(user: User) {
    try {
      const stripeCustomerId: string | null =
        await this.createCustomerStripe(user);

      const updatedUser: User = await this.userRepository.findByIdAndUpdate(
        user._id,
        { stripe_customer_id: stripeCustomerId },
      );

      updatedUser.usr_password = null;

      return updatedUser;
    } catch (error) {
      console.error('Failed to attach Stripe customer ID to user:', error);
      throw new Error('Failed to attach Stripe customer ID to user.');
    }
  }

  async resetPassword(email: string): Promise<UserReset> {
    const user: User = await this.userRepository.findOne({
      usr_email: email,
    });

    user.usr_password = null;

    const token: string = generateToken(40);
    const forgotPasswordLink: string = `${process.env.FORGOT_PASSWORD_LINK}/${token}`;
    const htmlTemplate: string = resetPasswordTemplate(
      user,
      forgotPasswordLink,
    );

    try {
      await this.mailerService.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: SUBJECT_RESET_PASSWORD,
        html: htmlTemplate,
      });
    } catch (error) {
      throw new InternalServerErrorException();
    }

    const data = {
      usr_rest_email: email,
      usr_rest_token: token,
      usr_rest_expired_at: TOKEN_AUTH_EXPIRED_AT,
    };

    return await this.userResetRepository.create(data);
  }
}

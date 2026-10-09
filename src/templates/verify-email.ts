import { User } from '../modules/users/schemas/user.schema';
import { escapeHtml } from '../utils/string/escape-html';
import { emailButton, emailLayout } from './layout';

export const verifyEmailTemplate = (user: User, verificationLink: string) =>
  emailLayout(
    'Confirm your email address',
    `
      <p>Hello ${escapeHtml(user.usr_username)},</p>
      <p>Welcome to K-Progressed! Please confirm your email address to activate your account. This link is valid for 48 hours.</p>
      ${emailButton('Confirm my email', verificationLink)}
    `,
  );

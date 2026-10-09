import { User } from '../modules/users/schemas/user.schema';
import { escapeHtml } from '../utils/string/escape-html';
import { emailButton, emailLayout } from './layout';

export const resetPasswordTemplate = (
  user: User,
  forgotPasswordLink: string,
) =>
  emailLayout(
    'Reset your password',
    `
      <p>Hello ${escapeHtml(user.usr_username)},</p>
      <p>We received a request to reset your password. This link is valid for 1 hour.</p>
      ${emailButton('Choose a new password', forgotPasswordLink)}
      <p>If you did not ask for this, you can ignore this email: your password stays the same.</p>
    `,
  );

import { applyDecorators } from '@nestjs/common';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_RULE_MESSAGE =
  'Password must contain at least 8 characters, one letter and one number';

export function StrongPassword() {
  return applyDecorators(
    IsString({ message: PASSWORD_RULE_MESSAGE }),
    MinLength(8, { message: PASSWORD_RULE_MESSAGE }),
    MaxLength(128, { message: 'Password must contain at most 128 characters' }),
    Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, { message: PASSWORD_RULE_MESSAGE }),
  );
}

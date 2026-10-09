import { IsNotEmpty, IsString } from 'class-validator';
import { PasswordMatch } from '../../../common/pipes/password-match/PasswordMatch';
import { StrongPassword } from '../../../common/validators/password/strong-password';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePassword {
  @ApiProperty({
    example: 'OldPassw0rd',
    description: "user's current password",
  })
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({ example: 'RvgtOt6sQ1', description: "user's new password" })
  @StrongPassword()
  password: string;

  @ApiProperty({
    example: 'RvgtOt6sQ1',
    description: "user's confirmation of password",
  })
  @IsNotEmpty()
  @PasswordMatch('confirmPassword', {
    message: "Password doesn't match with this confirmation of password",
  })
  confirmPassword: string;
}

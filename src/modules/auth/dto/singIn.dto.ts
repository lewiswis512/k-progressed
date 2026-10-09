import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SignIn {
  @ApiProperty({ example: 'john@gmail.com', description: "user's email" })
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Enter a valid email' })
  usr_email: string;

  @ApiProperty({ example: 'RvgtOt6sQ1', description: "user's password" })
  @IsString()
  @IsNotEmpty({ message: 'Password should not be empty' })
  usr_password: string;
}

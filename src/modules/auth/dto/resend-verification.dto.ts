import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ResendVerification {
  @ApiProperty({ example: 'john@gmail.com', description: "user's email" })
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Enter a valid email' })
  email: string;
}

import {
  Equals,
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { IsUnique } from '../../../common/pipes/unique-field/IsUnique';
import { StrongPassword } from '../../../common/validators/password/strong-password';
import { ApiProperty } from '@nestjs/swagger';

export class Registration {
  @ApiProperty({ example: 'John', description: 'username' })
  @IsString()
  @IsNotEmpty({ message: 'Username should not be empty' })
  @MaxLength(30, { message: 'Username must contain at most 30 characters' })
  @Matches(/^[A-Za-z0-9._-]+$/, {
    message:
      'Username can only contain letters, numbers, dots, dashes and underscores',
  })
  @IsUnique(
    { collectionProperty: 'usr_username', collectionName: 'users' },
    { message: 'Username is already taken' },
  )
  usr_username: string;

  @ApiProperty({ example: 'john@gmail.com', description: "user's email" })
  @IsEmail({}, { message: 'Enter a valid email' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsUnique(
    { collectionProperty: 'usr_email', collectionName: 'users' },
    { message: 'Email is already used' },
  )
  usr_email: string;

  @ApiProperty({ example: 'RvgtOt6sQ1', description: "user's password" })
  @StrongPassword()
  usr_password: string;

  @ApiProperty({
    example: true,
    description:
      'The user accepts the terms of use, terms of sale and privacy policy',
  })
  @Equals(true, { message: 'You must accept the terms and the privacy policy' })
  acceptTerms: boolean;
}

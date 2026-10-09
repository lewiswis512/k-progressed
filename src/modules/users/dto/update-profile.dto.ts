import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfile {
  @ApiProperty({ example: 'John', description: 'username' })
  @IsString()
  @IsNotEmpty({ message: 'Username should not be empty' })
  @MaxLength(30, { message: 'Username must contain at most 30 characters' })
  usr_username: string;

  @ApiProperty({ example: 'John', description: "user's firstname" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  usr_firstname?: string;

  @ApiProperty({ example: 'Dupont', description: "user's lastname" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  usr_lastname?: string;

  @ApiProperty({
    description: "user's photo",
    type: 'string',
    format: 'binary',
    required: false,
  })
  file?: Express.Multer.File;
}

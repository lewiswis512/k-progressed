import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DeleteAccount {
  @ApiProperty({ example: 'RvgtOt6sQ1', description: "user's current password" })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}

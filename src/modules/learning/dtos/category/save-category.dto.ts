import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SaveCategory {
  @ApiProperty({ example: 'Marketing', description: 'Category Name' })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(60)
  ctgr_name: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SaveCategory {
  @ApiProperty({ example: 'Marketing', description: 'Category Name' })
  @IsNotEmpty({ message: 'Name is required' })
  ctgr_name: string;
}

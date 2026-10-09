import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SaveSection {
  @ApiProperty({ example: 'Introduction', description: 'Section Title' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200)
  sect_title: string;
}

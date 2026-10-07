import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class ReorderSections {
  @ApiProperty({
    example: ['675ecd4eb57c772b733fecd5', '675ecd4eb57c772b733fecd6'],
    description: 'Section ids of the course in their new display order',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Ids are required' })
  @IsMongoId({ each: true, message: 'Each id must be a valid section id' })
  ids: string[];
}

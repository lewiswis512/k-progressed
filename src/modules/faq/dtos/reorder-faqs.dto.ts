import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

export class ReorderFaqs {
  @ApiProperty({
    example: ['6ac632b8b6bf79e537ac9a3a', '6ac63160233324c3cc745e0b'],
    description: 'FAQ ids in their new display order',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Ids are required' })
  @IsMongoId({ each: true, message: 'Each id must be a valid FAQ id' })
  ids: string[];
}

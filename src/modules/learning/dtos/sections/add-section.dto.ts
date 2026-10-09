import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';
import { SaveSection } from './save-section.dto';

export class AddSection extends SaveSection {
  @ApiProperty({
    example: '675ecd4eb57c772b733fecd5',
    description: 'Course Id',
  })
  @IsMongoId({ message: 'Course is required' })
  course_id: string;
}

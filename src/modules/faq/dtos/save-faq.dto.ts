import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SaveFaq {
  @ApiProperty({
    example: 'How do I access a course after purchase?',
    description: 'FAQ question',
  })
  @IsString()
  @IsNotEmpty({ message: 'Question is required' })
  faq_question: string;

  @ApiProperty({
    example: 'Go to "My learning" from your profile menu.',
    description: 'FAQ answer',
  })
  @IsString()
  @IsNotEmpty({ message: 'Answer is required' })
  faq_answer: string;

  @ApiProperty({ example: 1, description: 'Display order', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  faq_order?: number;

  @ApiProperty({
    example: true,
    description: 'Visible on the home page',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  faq_isPublished?: boolean;
}

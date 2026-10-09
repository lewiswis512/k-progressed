import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { toOptionalNumber } from './add-comment-course.dto';

export class EditCommentCourse {
  @ApiProperty({ example: 4, description: 'Comment Rating from 1 to 5' })
  @Transform(toOptionalNumber, { toClassOnly: true })
  @IsOptional()
  @IsInt({ message: 'Rating must be a whole number' })
  @Max(5, { message: 'The maximum of rating is 5' })
  @Min(1, { message: 'The minimum of rating is 1' })
  comm_rating?: number;

  @ApiProperty({
    example: 'The course which missed me',
    description: 'Comment Content',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(5000)
  comm_content: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { IAddCommentDto } from '../../../interfaces/comments/IAddCommentDto';

export const toOptionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : Number(value);

export class AddCommentCourse implements IAddCommentDto {
  @ApiProperty({ example: 4, description: 'Comment Rating from 1 to 5' })
  @Transform(toOptionalNumber, { toClassOnly: true })
  @IsOptional()
  @IsInt({ message: 'Rating must be a whole number' })
  @Max(5, { message: 'The maximum of rating is 5' })
  @Min(1, { message: 'The minimum of rating is 1' })
  comm_rating?: number;

  @ApiProperty({
    example: "The course i've searched",
    description: 'Comment Content',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(5000)
  comm_content: string;

  @ApiProperty({
    example: null,
    description:
      'Comment Id<br /> if there is parent , ex: 676728c1cd6b56b41c8f1b55',
  })
  @IsOptional()
  @IsMongoId()
  comment_id: string | null;

  @ApiProperty({
    example: '675fbc4b3563cd8894f79ce4',
    description: 'Course Id',
  })
  @IsMongoId({ message: 'Course is required' })
  course_id: string;
}

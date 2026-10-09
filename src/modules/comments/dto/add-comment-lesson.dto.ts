import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IAddCommentDto } from '../../../interfaces/comments/IAddCommentDto';

export class AddCommentLesson implements IAddCommentDto {
  @ApiProperty({
    example: 'Best lesson, keep on',
    description: 'Comment Content',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(5000)
  comm_content: string;

  @ApiProperty({
    example: '6761b8ab3f368c5bd724e580',
    description: 'Comment Id',
  })
  @IsOptional()
  @IsMongoId()
  comment_id: string | null;

  @ApiProperty({
    example: '675fbd1100abc3bc3988b3b5',
    description: 'Lesson Id',
  })
  @IsMongoId({ message: 'Lesson is required' })
  lesson_id: string;
}

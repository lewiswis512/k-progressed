import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class EditCommentLesson {
  @ApiProperty({
    example: 'The lesson which missed me',
    description: 'Comment Content',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content is required' })
  @MaxLength(5000)
  comm_content: string;
}

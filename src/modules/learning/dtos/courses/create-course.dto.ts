import { ApiProperty } from '@nestjs/swagger';
import { SaveCourseDto } from './save-course.dto';
import { IsNotEmpty } from 'class-validator';

export class CreateCourse extends SaveCourseDto {
  @ApiProperty({
    description: 'Course Photo',
    type: 'string',
    format: 'binary',
  })
  file: Express.Multer.File;

  author_id: string;

  @ApiProperty({
    example: '681af23bfd9ba8296ce97a69',
    description: 'Teacher Id',
  })
  @IsNotEmpty({ message: 'Teacher Id is required' })
  teacher_id: string;
}

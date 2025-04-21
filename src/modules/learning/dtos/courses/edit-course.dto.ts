import { ApiProperty } from '@nestjs/swagger';
import { SaveCourseDto } from './save-course.dto';

export class EditCourse extends SaveCourseDto {
  @ApiProperty({
    description: 'Course Photo',
    type: 'string',
    format: 'binary',
    required: false,
  })
  file?: Express.Multer.File;
}

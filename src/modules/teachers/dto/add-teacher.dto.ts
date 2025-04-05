import { ApiProperty } from '@nestjs/swagger';
import { SaveTeacherDto } from './save-teacher.dto';
import { IsNotEmpty } from 'class-validator';

export class AddTeacherDto extends SaveTeacherDto {
  @ApiProperty({ description: 'user id', example: '673ddb690e836d0770659a0b' })
  @IsNotEmpty({ message: 'User id is required' })
  user_id: string;
}

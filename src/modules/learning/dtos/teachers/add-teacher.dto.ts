import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';
import { SaveTeacher } from './save-teacher.dto';

export class AddTeacher extends SaveTeacher {
  @ApiProperty({ description: 'user id', example: '673ddb690e836d0770659a0b' })
  @IsNotEmpty({ message: 'User id is required' })
  user_id: string;
}

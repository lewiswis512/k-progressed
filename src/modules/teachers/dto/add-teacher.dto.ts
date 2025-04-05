import { ApiProperty } from '@nestjs/swagger';
import { SaveTeacher } from './save-teacher.dto';
import { IsNotEmpty } from 'class-validator';

export class AddTeacher extends SaveTeacher {
  @ApiProperty({ description: 'user id', example: '673ddb690e836d0770659a0b' })
  @IsNotEmpty({ message: 'User id is required' })
  user_id: string;
}

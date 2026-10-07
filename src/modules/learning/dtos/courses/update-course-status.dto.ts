import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';

export class UpdateCourseStatus {
  @ApiProperty({
    enum: CourseStatusEnum,
    example: CourseStatusEnum.VALIDATED,
    description: 'New status: 1 pending, 2 validated, 3 rejected',
  })
  @IsEnum(CourseStatusEnum, { message: 'Status is invalid' })
  crs_status: CourseStatusEnum;
}

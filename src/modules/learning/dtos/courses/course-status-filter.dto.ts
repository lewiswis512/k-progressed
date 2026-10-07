import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { CourseStatusEnum } from '../../../../utils/enums/course-status.enum';

export class CourseStatusFilter {
  @ApiPropertyOptional({
    enum: CourseStatusEnum,
    description: 'Filter by status: 1 pending, 2 validated, 3 rejected',
  })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(CourseStatusEnum, { message: 'Status is invalid' })
  status?: CourseStatusEnum;
}

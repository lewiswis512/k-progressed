import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsMongoId, IsOptional } from 'class-validator';
import { LevelEnum } from '../../../../utils/enums/level.enum';

export const COURSE_SORTS = ['newest', 'price_asc', 'price_desc', 'title'] as const;
export type CourseSort = (typeof COURSE_SORTS)[number];

export class PublicCourseFilter {
  @ApiPropertyOptional({ description: 'Category id' })
  @IsOptional()
  @IsMongoId({ message: 'Category is invalid' })
  category?: string;

  @ApiPropertyOptional({ enum: LevelEnum })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(LevelEnum, { message: 'Level is invalid' })
  level?: LevelEnum;

  @ApiPropertyOptional({ enum: ['free', 'paid'] })
  @IsOptional()
  @IsIn(['free', 'paid'], { message: 'Price filter is invalid' })
  price?: 'free' | 'paid';

  @ApiPropertyOptional({ enum: COURSE_SORTS })
  @IsOptional()
  @IsIn(COURSE_SORTS, { message: 'Sort is invalid' })
  sort?: CourseSort;
}

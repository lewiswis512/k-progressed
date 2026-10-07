import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class SaveTeacher {
  @ApiProperty({
    example:
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sagittis, at sollicitudin odio tristique fusce suscipit pretium vehicula, velit duis cubilia maecenas',
    description: "Teacher's biography",
  })
  @IsNotEmpty({ message: 'Biography is required' })
  tchr_biography: string;

  @ApiProperty({
    example: 'Trainer',
    description: "Teacher's title",
  })
  @IsNotEmpty({ message: 'Title is required' })
  tchr_title: string;

  @ApiPropertyOptional({
    example: true,
    description: 'The teacher offers one-to-one mentoring calls',
  })
  @IsOptional()
  @IsBoolean({ message: 'Is mentor must be a boolean' })
  tchr_is_mentor?: boolean;

  @ApiPropertyOptional({
    example: 50,
    description: 'Price of a one hour mentoring call, in euros',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Hourly rate must be a number with at most 2 decimals' },
  )
  @Min(0, { message: 'Hourly rate must be 0 or more' })
  @Max(10000, { message: 'Hourly rate must be 10000 or less' })
  tchr_hourly_rate?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class MentorAvailabilityDto {
  @ApiProperty({ example: 1, description: 'Day of week, 0 is Sunday' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  day: number;

  @ApiProperty({ example: ['09:00', '14:00'], description: 'Start times (Paris time)' })
  @IsArray()
  @ArrayMaxSize(14)
  @Matches(/^(0[7-9]|1\d|20):(00|30)$/, {
    each: true,
    message: 'Times must be between 07:00 and 20:30, on the hour or half hour',
  })
  times: string[];
}

export class SaveTeacher {
  @ApiProperty({
    example:
      'Lorem ipsum dolor sit amet consectetur adipiscing elit sagittis, at sollicitudin odio tristique fusce suscipit pretium vehicula, velit duis cubilia maecenas',
    description: "Teacher's biography",
  })
  @IsString()
  @IsNotEmpty({ message: 'Biography is required' })
  @MaxLength(5000)
  tchr_biography: string;

  @ApiProperty({
    example: 'Trainer',
    description: "Teacher's title",
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(120)
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

  @ApiPropertyOptional({ type: [MentorAvailabilityDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => MentorAvailabilityDto)
  tchr_availability?: MentorAvailabilityDto[];
}

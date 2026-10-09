import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SaveLessonDto {
  @ApiProperty({
    example: 'lesson 1',
    description: 'Lesson 1',
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200)
  lssn_title: string;

  @ApiProperty({ example: false, description: 'Free preview lesson' })
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  lssn_is_free: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LevelEnum } from '../../../../utils/enums/level.enum';
import { uppercaseFirstLetter } from '../../../../utils/string/uppercaseFirstLetter';

const levels = Object.entries(LevelEnum).filter(
  ([levelId]) => !isNaN(Number(levelId)),
);

const levelsIdAndlevelsName = levels
  .map(([levelId, levelName]) => {
    return `${levelId} => ${uppercaseFirstLetter(levelName as string)}<br />`;
  })
  .join(' ');

export class SaveCourseDto {
  @ApiProperty({ example: 'Javascript for pro', description: 'Course Title' })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(150, { message: 'Title must contain at most 150 characters' })
  crs_title: string;

  @ApiProperty({
    example: 'Description of Javascript for pro',
    description: 'Course Description',
  })
  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(10000)
  crs_description: string;

  @ApiProperty({
    example: '25.8',
    description: 'Course Price in euros, 0 for a free course',
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Price must be a number with at most 2 decimals' },
  )
  @Min(0, { message: 'Price must be 0 or more' })
  @Max(10000, { message: 'Price must be 10000 or less' })
  crs_price: number;

  @ApiProperty({
    enum: LevelEnum,
    default: LevelEnum.BEGINNER,
    description: `Course Level <br /> ${levelsIdAndlevelsName}`,
  })
  @Type(() => Number)
  @IsEnum(LevelEnum, { message: 'Level is invalid' })
  level_id: LevelEnum;

  @ApiProperty({
    example: '681af23bfd9ba6796ce97a69',
    description: 'Category Id',
  })
  @IsMongoId({ message: 'Category is required' })
  category_id: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchDto {
  @ApiPropertyOptional({ description: 'keyword to search' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}

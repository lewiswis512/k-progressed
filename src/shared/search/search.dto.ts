import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class SearchDto {
  @ApiPropertyOptional({ description: 'keyword to search' })
  @IsOptional()
  q?: string;
}

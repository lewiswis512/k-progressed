import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class BookedSlotsQuery {
  @ApiProperty({ example: '2026-10-21', description: 'Call date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date: string;
}

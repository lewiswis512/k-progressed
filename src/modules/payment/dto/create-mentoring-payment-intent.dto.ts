import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, Matches } from 'class-validator';

export class CreateMentoringPaymentIntent {
  @ApiProperty({
    example: '675ecd4eb57c772b733fecd5',
    description: 'Mentor id',
  })
  @IsMongoId({ message: 'Teacher id is invalid' })
  teacherId: string;

  @ApiProperty({ example: '2026-10-21', description: 'Call date' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date must be YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: '14:30', description: 'Call time' })
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be HH:mm' })
  time: string;
}

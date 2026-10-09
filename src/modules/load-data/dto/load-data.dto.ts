import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

export const LOAD_DATA_CONFIRMATION = 'LOAD DATA';

export class LoadData {
  @ApiProperty({
    example: LOAD_DATA_CONFIRMATION,
    description:
      'Type LOAD DATA to confirm that every existing data will be deleted',
  })
  @Equals(LOAD_DATA_CONFIRMATION, {
    message: `Type ${LOAD_DATA_CONFIRMATION} to confirm`,
  })
  confirmation: string;
}

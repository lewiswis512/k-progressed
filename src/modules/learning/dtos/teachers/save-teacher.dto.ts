import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

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
}

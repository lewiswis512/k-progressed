import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RoleEnum } from '../../../utils/enums/role.enum';

export class UpdateUserRole {
  @ApiProperty({ enum: RoleEnum, example: RoleEnum.USER })
  @IsEnum(RoleEnum, { message: 'Role is invalid' })
  usr_role: RoleEnum;
}

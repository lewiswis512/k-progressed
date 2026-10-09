import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleEnum } from '../../utils/enums/role.enum';
import { StatisticService } from './statistic.service';

@Controller('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleEnum.SUPERADMIN)
export class StatisticController {
  constructor(private statisticService: StatisticService) {}

  @Get('stats')
  async stats() {
    return this.statisticService.stats();
  }
}

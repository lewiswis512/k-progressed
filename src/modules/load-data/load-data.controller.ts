import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RoleEnum } from '../../utils/enums/role.enum';
import { LoadData } from './dto/load-data.dto';
import { LoadDataService } from './load-data.service';

@Controller('load-data')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(RoleEnum.SUPERADMIN)
export class LoadDataController {
  public constructor(private loadDataService: LoadDataService) {}

  @Post()
  @HttpCode(200)
  async loadData(@Body() _loadData: LoadData) {
    return this.loadDataService.loadData();
  }
}

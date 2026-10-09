import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { SearchDto } from '../../shared/search/search.dto';
import { RoleEnum } from '../../utils/enums/role.enum';
import { CreatePurchase } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';

@Controller('purchases')
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class PurchasesController {
  constructor(private purchaseService: PurchasesService) {}

  @Get()
  async list(@Req() req: AuthenticatedRequest) {
    return await this.purchaseService.findMine(req.user.id);
  }

  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  async listForAdmin(
    @Query() search: SearchDto,
    @Query() pagination: PaginationDto,
  ) {
    return await this.purchaseService.findForAdmin(
      search.q,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  async show(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return await this.purchaseService.findOwned(id, req.user);
  }

  @Post()
  async add(
    @Body() createPurchase: CreatePurchase,
    @Req() req: AuthenticatedRequest,
  ) {
    return await this.purchaseService.store(createPurchase, req.user);
  }
}

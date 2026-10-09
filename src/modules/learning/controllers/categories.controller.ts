import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { CategoryService } from '../services/category.service';
import { Category } from '../schemas/category.schema';
import { SaveCategory } from '../dtos/category/save-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private categoryService: CategoryService) {}

  @Get()
  @ApiOkResponse({
    description: 'The categories have been successfully retrieved.',
  })
  async list(): Promise<Category[]> {
    return await this.categoryService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'The category have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The category is not found.',
  })
  async show(@Param('id') id: string): Promise<Category> {
    return await this.categoryService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiCreatedResponse({
    description: 'The category has been successfully created.',
  })
  async add(@Body() saveCategory: SaveCategory): Promise<Category> {
    return await this.categoryService.store(saveCategory);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'The category has been successfully updated.',
  })
  @ApiNotFoundResponse({
    description: 'The category is not found.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  async update(
    @Param('id') id: string,
    @Body() saveCategory: SaveCategory,
  ): Promise<Category> {
    return await this.categoryService.update(id, saveCategory);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiNoContentResponse({
    description: 'The category have been successfully deleted.',
  })
  async delete(@Param('id') id: string): Promise<void> {
    await this.categoryService.delete(id);
  }
}

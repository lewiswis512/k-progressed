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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { AddSection } from '../dtos/sections/add-section.dto';
import { EditSection } from '../dtos/sections/edit-section.dto';
import { Lesson } from '../schemas/lesson.schema';
import { Section } from '../schemas/section.schema';
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
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({
    description: 'The category has been successfully created.',
  })
  async add(@Body() saveCategory: SaveCategory): Promise<Category> {
    return await this.categoryService.store(saveCategory);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard)
  @ApiNoContentResponse({
    description: 'The category have been successfully deleted.',
  })
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    await this.categoryService.delete(id, req.user.id);
  }
}

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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { EditFaq } from '../dtos/edit-faq.dto';
import { ReorderFaqs } from '../dtos/reorder-faqs.dto';
import { SaveFaq } from '../dtos/save-faq.dto';
import { Faq } from '../schemas/faq.schema';
import { FaqService } from '../services/faq.service';

@Controller('faqs')
export class FaqController {
  constructor(private faqService: FaqService) {}

  @Get()
  @ApiOkResponse({
    description: 'The published FAQs, sorted by display order.',
  })
  async list(): Promise<Faq[]> {
    return await this.faqService.findPublished();
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'All FAQs, including unpublished ones.',
  })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async listAll(): Promise<Faq[]> {
    return await this.faqService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'The FAQ has been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The FAQ is not found.',
  })
  async show(@Param('id') id: string): Promise<Faq> {
    return await this.faqService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiCreatedResponse({
    description: 'The FAQ has been successfully created.',
  })
  @ApiBadRequestResponse({ description: 'Bad request.' })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async add(@Body() saveFaq: SaveFaq): Promise<Faq> {
    return await this.faqService.store(saveFaq);
  }

  @Patch('reorder')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'The FAQs have been successfully reordered.',
  })
  @ApiBadRequestResponse({ description: 'Bad request.' })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async reorder(@Body() reorderFaqs: ReorderFaqs): Promise<Faq[]> {
    return await this.faqService.reorder(reorderFaqs.ids);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'The FAQ has been successfully updated.',
  })
  @ApiNotFoundResponse({
    description: 'The FAQ is not found.',
  })
  @ApiBadRequestResponse({ description: 'Bad request.' })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async update(
    @Param('id') id: string,
    @Body() editFaq: EditFaq,
  ): Promise<Faq> {
    return await this.faqService.update(id, editFaq);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiNoContentResponse({
    description: 'The FAQ has been successfully deleted.',
  })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.faqService.delete(id);
  }
}

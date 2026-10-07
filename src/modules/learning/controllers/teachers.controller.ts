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
import { TeachersService } from '../services/teachers.service';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { AddTeacher } from '../dtos/teachers/add-teacher.dto';
import { SaveTeacher } from '../dtos/teachers/save-teacher.dto';

@Controller('teachers')
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  @ApiOkResponse({
    description: 'The teachers have been successfully retrieved.',
  })
  async list() {
    return await this.teachersService.findAll();
  }

  @Get('mentors')
  @ApiOkResponse({
    description: 'The teachers offering mentoring calls.',
  })
  async mentors() {
    return await this.teachersService.findMentors();
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'The teacher have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The teacher is not found.',
  })
  async show(@Param('id') id: string) {
    return await this.teachersService.findById(id);
  }

  @Get('by/user/:userSlug')
  @ApiOkResponse({
    description: 'The teacher have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The teacher is not found.',
  })
  async byUserSlug(@Param('userSlug') userSlug: string) {
    return await this.teachersService.findByUserSlug(userSlug);
  }

  @Get('by/:userId')
  @ApiOkResponse({
    description: 'The teacher have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The teacher is not found.',
  })
  async findByUserId(@Param('userId') userId: string) {
    return await this.teachersService.findByUserId(userId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({
    description: 'The teacher has been successfully created.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  async add(@Req() req: any, @Body() addTeacher: AddTeacher) {
    return await this.teachersService.store(req.user.id, addTeacher);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The teacher has been successfully updated.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update this teacher profile.',
  })
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() saveTeacher: SaveTeacher,
  ) {
    return await this.teachersService.update(id, saveTeacher, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiNoContentResponse({
    description: 'The teacher has been successfully deleted.',
  })
  async delete(@Param('id') id: string) {
    await this.teachersService.delete(id);
  }
}

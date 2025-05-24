import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ICourseWithAverageRating } from '../../../interfaces/courses/ICourseWithAverageRating';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { MAX_SIZE_IN_BYTES_UPLOAD_PHOTO } from '../../../utils/constants/uploads/max-size-upload';
import { VALID_IMAGE_MIME_TYPES } from '../../../utils/constants/files/mime-types';
import { CoursesService } from '../services/courses.service';
import { CreateCourse } from '../dtos/courses/create-course.dto';
import { EditCourse } from '../dtos/courses/edit-course.dto';
import { Course } from '../schemas/course.schema';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { CustomUploadFileTypeValidatorOptions } from '../../../common/validators/files/CustomUploadFileTypeValidator';
import { PaginationDto } from '../../../shared/pagination/pagination.dto';
import { ICoursePagination } from '../interfaces/ICoursePagination';
import { SearchDto } from '../../../shared/search/search.dto';
import { ImageFile } from '../../../common/decorators/image-file.decorator';

@Controller('courses')
export class CoursesController {
  constructor(private courseService: CoursesService) {}

  @Get()
  @ApiOkResponse({
    description: 'The courses have been successfully retrieved.',
  })
  async list(
    @Query() search: SearchDto,
    @Query() pagination: PaginationDto,
  ): Promise<ICoursePagination> {
    const { page, limit } = pagination;

    return await this.courseService.findAll(search.q, page, limit);
  }

  @Get('show/:id')
  @ApiOkResponse({
    description: 'The course have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The course is not found.',
  })
  async showById(@Param('id') id: string): Promise<Course> {
    return await this.courseService.findById(id);
  }

  @Get('view/:slug')
  @ApiOkResponse({
    description: 'The course have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The course is not found.',
  })
  async viewBySlug(
    @Param('slug') slug: string,
  ): Promise<ICourseWithAverageRating> {
    return await this.courseService.findBySlug(slug);
  }

  @Get('contents/:id')
  @ApiOkResponse({
    description: 'The course content have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The course content is not found.',
  })
  async contents(
    @Param('id') id: string,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    return this.courseService.getContent(id, false);
  }

  @Get('view-lessons/:id')
  @ApiOkResponse({
    description: 'The lessons content have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The lessons content is not found.',
  })
  async viewLessons(
    @Param('id') id: string,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    return this.courseService.getContent(id, true);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'The course has been successfully created.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiBody({ type: CreateCourse })
  @ApiUnprocessableEntityResponse({
    description: 'File is required.',
  })
  async add(
    @Req() req: any,
    @Body() createCourseDto: CreateCourse,
    @ImageFile({ fileIsRequired: true })
    file: Express.Multer.File,
  ): Promise<Course> {
    return await this.courseService.store(req.user.id, createCourseDto, file);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({
    description: 'The course has been successfully updated.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiBody({ type: EditCourse })
  @ApiUnprocessableEntityResponse({
    description: 'File is required.',
  })
  async update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() editCourseDto: EditCourse,
    @ImageFile({ fileIsRequired: false })
    file: Express.Multer.File,
  ): Promise<Course> {
    return await this.courseService.update(
      id,
      editCourseDto,
      file,
      req.user.id,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiNoContentResponse({
    description: 'The course has been successfully deleted.',
  })
  async delete(@Param('id') id: string, @Req() req: any): Promise<void> {
    await this.courseService.delete(id, req.user.id);
  }
}

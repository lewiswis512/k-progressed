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
  Query,
  Req,
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
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { MAX_SIZE_IN_BYTES_UPLOAD_PHOTO } from '../../../utils/constants/uploads/max-size-upload';
import { ImageFile } from '../../../common/decorators/image-file.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { OptionalAuthGuard } from '../../../common/guards/optional-auth.guard';
import { CourseAccessService } from '../../../common/access/course-access.service';
import { PublicCourseFilter } from '../dtos/courses/public-course-filter.dto';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { ICourseContentsWithTotalSectionsLessonsDuration } from '../../../interfaces/courses/ICourseContentsWithTotalSectionsLessonsDuration';
import { ICourseWithAverageRating } from '../../../interfaces/courses/ICourseWithAverageRating';
import { PaginationDto } from '../../../shared/pagination/pagination.dto';
import { SearchDto } from '../../../shared/search/search.dto';
import { CreateCourse } from '../dtos/courses/create-course.dto';
import { EditCourse } from '../dtos/courses/edit-course.dto';
import { CourseStatusFilter } from '../dtos/courses/course-status-filter.dto';
import { UpdateCourseStatus } from '../dtos/courses/update-course-status.dto';
import { IAdminCoursePagination } from '../interfaces/IAdminCoursePagination';
import { AdminCoursesService } from '../services/courses/list-admin.service';
import { UpdateCourseStatusService } from '../services/courses/update-status.service';
import { ICoursePagination } from '../interfaces/ICoursePagination';
import { Course } from '../schemas/course.schema';
import { CourseContentService } from '../services/courses/get-content.service';
import { GetCourseByIdService } from '../services/courses/get-by-id.service';
import { CoursesService } from '../services/courses/list.service';
import { DeleteCourseService } from '../services/courses/delete.service';
import { UpdateCourseService } from '../services/courses/update.service';
import { CoursesByAuthorService } from '../services/courses/get-by-author.service';
import { AddCourseService } from '../services/courses/add.service';
import { GetCoursesBySlugService } from '../services/courses/get-by-slug.service';
import { AuthenticatedRequest } from '../../../common/auth/authenticated-request';

@Controller('courses')
export class CoursesController {
  constructor(
    private courseContentService: CourseContentService,
    private getCourseByIdService: GetCourseByIdService,
    private coursesService: CoursesService,
    private coursesByAuthorService: CoursesByAuthorService,
    private getCoursesBySlugService: GetCoursesBySlugService,
    private addCourseService: AddCourseService,
    private updateCourseService: UpdateCourseService,
    private deleteCourseService: DeleteCourseService,
    private adminCoursesService: AdminCoursesService,
    private updateCourseStatusService: UpdateCourseStatusService,
    private courseAccessService: CourseAccessService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'The courses have been successfully retrieved.',
  })
  async list(
    @Query() search: SearchDto,
    @Query() pagination: PaginationDto,
    @Query() filter: PublicCourseFilter,
  ): Promise<ICoursePagination> {
    const { page, limit } = pagination;

    return await this.coursesService.get(search.q, page, limit, {
      category: filter.category,
      level: filter.level,
      price: filter.price,
      sort: filter.sort,
    });
  }

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'All courses of every author, searchable and paginated.',
  })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async listForAdmin(
    @Query() search: SearchDto,
    @Query() pagination: PaginationDto,
    @Query() filter: CourseStatusFilter,
  ): Promise<IAdminCoursePagination> {
    const { page, limit } = pagination;

    return await this.adminCoursesService.get(
      search.q,
      page,
      limit,
      filter.status,
    );
  }

  @Get('by/:authorId')
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The courses have been successfully retrieved.',
  })
  async byAuthor(
    @Param('authorId') authorId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Course[]> {
    return await this.coursesByAuthorService.byAuthor(authorId, req.user);
  }

  @Get('show/:id')
  @UseGuards(OptionalAuthGuard)
  @ApiOkResponse({
    description: 'The course have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The course is not found.',
  })
  async showById(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Course> {
    return await this.getCourseByIdService.visibleById(id, req.user);
  }

  @Get('view/:slug')
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The course have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The course is not found.',
  })
  async viewBySlug(
    @Param('slug') slug: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ICourseWithAverageRating> {
    return await this.getCoursesBySlugService.findBy(slug, req.user);
  }

  @Get('contents/:id')
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The course content have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The course content is not found.',
  })
  async contents(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    await this.getCourseByIdService.visibleById(id, req.user);

    return this.courseContentService.get(id, false);
  }

  @Get('view-lessons/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The lessons content have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The lessons content is not found.',
  })
  async viewLessons(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ICourseContentsWithTotalSectionsLessonsDuration> {
    const course = await this.getCourseByIdService.visibleById(id, req.user);

    await this.courseAccessService.assertAccess(req.user, course);

    return this.courseContentService.get(id, true);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.ADMIN, RoleEnum.SUPERADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_IN_BYTES_UPLOAD_PHOTO },
    }),
  )
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
    @Req() req: AuthenticatedRequest,
    @Body() createCourseDto: CreateCourse,
    @ImageFile({ fileIsRequired: true })
    file: Express.Multer.File,
  ): Promise<Course> {
    return await this.addCourseService.store(
      req.user.id,
      createCourseDto,
      file,
    );
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'The course status has been successfully updated.',
  })
  @ApiNotFoundResponse({
    description: 'The course is not found.',
  })
  @ApiBadRequestResponse({ description: 'Bad request.' })
  @ApiForbiddenResponse({ description: 'Super admin role required.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateCourseStatus: UpdateCourseStatus,
  ): Promise<Course> {
    return await this.updateCourseStatusService.update(
      id,
      updateCourseStatus.crs_status,
    );
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_IN_BYTES_UPLOAD_PHOTO },
    }),
  )
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
    @Req() req: AuthenticatedRequest,
    @Body() editCourseDto: EditCourse,
    @ImageFile({ fileIsRequired: false })
    file: Express.Multer.File,
  ): Promise<Course> {
    return await this.updateCourseService.update(
      id,
      req.user,
      editCourseDto,
      file,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiNoContentResponse({
    description: 'The course has been successfully deleted.',
  })
  async delete(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.deleteCourseService.delete(id, req.user);
  }
}

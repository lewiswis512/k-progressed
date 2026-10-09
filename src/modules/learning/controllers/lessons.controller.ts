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
import { MAX_SIZE_IN_BYTES_UPLOAD_VIDEO } from '../../../utils/constants/uploads/max-size-upload';
import { videoFile } from '../../../common/decorators/video-file.decorator';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RoleEnum } from '../../../utils/enums/role.enum';
import { AddLesson } from '../dtos/lessons/add-lesson.dto';
import { EditLesson } from '../dtos/lessons/edit-lesson.dto';
import { Lesson } from '../schemas/lesson.schema';
import { AddLessonService } from '../services/lessons/add.service';
import { DeleteLessonService } from '../services/lessons/delete.service';
import { UpdateLessonservice } from '../services/lessons/update.service';
import {
  FreeLessonService,
  IFreeLesson,
} from '../services/lessons/free.service';
import { LessonService } from '../services/lessons/find-one-by-id.service';
import { LessonsService } from '../services/lessons/list.service';
import { AuthenticatedRequest } from '../../../common/auth/authenticated-request';

@Controller('lessons')
export class LessonsController {
  constructor(
    private lessonsService: LessonsService,
    private lessonService: LessonService,
    private addLessonService: AddLessonService,
    private deleteLessonService: DeleteLessonService,
    private updateLessonservice: UpdateLessonservice,
    private freeLessonService: FreeLessonService,
  ) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({
    description: 'The lessons have been successfully retrieved.',
  })
  async list(): Promise<Lesson[]> {
    return await this.lessonsService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The lesson have been successfully retrieved.',
  })
  @ApiNotFoundResponse({
    description: 'The lesson is not found.',
  })
  async show(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Lesson> {
    return await this.lessonService.viewable(id, req.user);
  }

  @Get('free/:courseId')
  @ApiOkResponse({
    description: 'The free lessons have been successfully retrieved.',
  })
  async getFree(@Param('courseId') courseId: string): Promise<IFreeLesson[]> {
    return await this.freeLessonService.getByCourseId(courseId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_IN_BYTES_UPLOAD_VIDEO },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({
    description: 'The lesson has been successfully created.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update the lesson.',
  })
  @ApiBody({ type: AddLesson })
  @ApiUnprocessableEntityResponse({
    description: 'File is required.',
  })
  async add(
    @Body() addLesson: AddLesson,
    @Req() req: AuthenticatedRequest,
    @videoFile({ fileIsRequired: true })
    file: Express.Multer.File,
  ): Promise<Lesson> {
    return await this.addLessonService.store(addLesson, file, req.user);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_IN_BYTES_UPLOAD_VIDEO },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({
    description: 'The lesson has been successfully updated.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update the lesson.',
  })
  @ApiBody({ type: EditLesson })
  @ApiUnprocessableEntityResponse({
    description: 'File is required.',
  })
  async update(
    @Param('id') id: string,
    @Body() editLesson: EditLesson,
    @Req() req: AuthenticatedRequest,
    @videoFile({ fileIsRequired: false })
    file: Express.Multer.File,
  ): Promise<Lesson> {
    return await this.updateLessonservice.update(
      id,
      editLesson,
      file,
      req.user,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  @ApiNoContentResponse({
    description: 'The lesson have been successfully deleted.',
  })
  async delete(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.deleteLessonService.delete(id, req.user);
  }
}

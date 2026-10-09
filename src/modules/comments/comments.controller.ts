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
import { CommentEnum } from '../../utils/enums/comment.enum';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../utils/enums/role.enum';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { SearchDto } from '../../shared/search/search.dto';
import { CommentsService } from './comments.service';
import { AddCommentCourse } from './dto/add-comment-course.dto';
import { AddCommentLesson } from './dto/add-comment-lesson.dto';
import { EditCommentCourse } from './dto/edit-comment-course.dto';
import { EditCommentLesson } from './dto/edit-comment-lesson.dto';
import { ICommentResponse } from '../../interfaces/comments/ICommentResponse';
import { ICommentBySource } from '../../interfaces/comments/ICommentBySource';
import { Comment } from './schemas/comment.schema';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';

@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('admin')
  @ApiBearerAuth()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  @ApiOkResponse({ description: 'Latest comments for moderation.' })
  async listForModeration(
    @Query() search: SearchDto,
    @Query() pagination: PaginationDto,
  ) {
    return this.commentsService.listForModeration(
      search.q,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'The comment has been successfully retrieved.',
  })
  async findById(@Param('id') id: string): Promise<Comment> {
    return await this.commentsService.findById(id);
  }

  @Get('by/course/:courseId')
  @ApiOkResponse({
    description: 'The comments by course have been successfully retrieved.',
  })
  async findByCourse(
    @Param('courseId') courseId: string,
  ): Promise<ICommentBySource> {
    return await this.commentsService.findByCourse(courseId);
  }

  @Get('by/lesson/:lessonId')
  @ApiOkResponse({
    description: 'The comments by lesson have been successfully retrieved.',
  })
  async findByLesson(
    @Param('lessonId') lessonId: string,
  ): Promise<ICommentBySource> {
    return await this.commentsService.findByLesson(lessonId);
  }

  @Post('course')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({
    description: 'The comment of a course has been successfully created.',
  })
  async addCourse(
    @Req() req: AuthenticatedRequest,
    @Body() addCommentCourse: AddCommentCourse,
  ): Promise<ICommentResponse> {
    return await this.commentsService.store(
      req.user,
      addCommentCourse,
      CommentEnum.COURSE,
    );
  }

  @Post('lesson')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiCreatedResponse({
    description: 'The comment of a lesson has been successfully created.',
  })
  async addLesson(
    @Req() req: AuthenticatedRequest,
    @Body() addCommentLesson: AddCommentLesson,
  ): Promise<ICommentResponse> {
    return await this.commentsService.store(
      req.user,
      addCommentLesson,
      CommentEnum.LESSON,
    );
  }

  @Patch('course/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The comment has been successfully updated.',
  })
  @ApiNotFoundResponse({
    description: 'The comment is not found.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update the comment.',
  })
  async updateCourse(
    @Param('id') id: string,
    @Body() editCommentDto: EditCommentCourse,
    @Req() req: AuthenticatedRequest,
  ): Promise<Comment> {
    return await this.commentsService.update(id, editCommentDto, req.user.id);
  }

  @Patch('lesson/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The comment has been successfully updated.',
  })
  @ApiNotFoundResponse({
    description: 'The comment is not found.',
  })
  @ApiBadRequestResponse({
    description: 'Bad request.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update the comment.',
  })
  async update(
    @Param('id') id: string,
    @Body() editCommentDto: EditCommentLesson,
    @Req() req: AuthenticatedRequest,
  ): Promise<Comment> {
    return await this.commentsService.update(id, editCommentDto, req.user.id);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({
    description: 'The comment have been successfully deleted.',
  })
  async delete(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    return await this.commentsService.delete(id, req.user);
  }

  @Patch('like/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The comment has been successfully liked.',
  })
  async like(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Comment> {
    return await this.commentsService.like(id, req.user.id);
  }

  @Patch('dislike/:id')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'The comment has been successfully disliked.',
  })
  async dislike(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Comment> {
    return await this.commentsService.dislike(id, req.user.id);
  }
}

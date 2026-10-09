import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ProgressService } from './progress.service';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';

@Controller()
export class ProgressController {
  constructor(private progressService: ProgressService) {}

  @Get('learning')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @ApiOkResponse({
    description: 'Purchased courses with the learner progress.',
  })
  async learning(@Req() req: AuthenticatedRequest) {
    return this.progressService.learning(req.user);
  }

  @Get('progress/courses/:courseId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async courseProgress(
    @Param('courseId') courseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.forCourse(courseId, req.user);
  }

  @Post('progress/lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async complete(
    @Param('lessonId') lessonId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.complete(lessonId, req.user);
  }

  @Delete('progress/lessons/:lessonId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async uncomplete(
    @Param('lessonId') lessonId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.uncomplete(lessonId, req.user);
  }

  @Post('certificates/courses/:courseId')
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  async issueCertificate(
    @Param('courseId') courseId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.progressService.issueCertificate(courseId, req.user);
  }

  @Get('certificates/:certNumber')
  @ApiOkResponse({ description: 'Public certificate verification.' })
  async verifyCertificate(@Param('certNumber') certNumber: string) {
    return this.progressService.verifyCertificate(certNumber);
  }
}

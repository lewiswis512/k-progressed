import {
  Body,
  Controller,
  Get,
  HttpStatus,
  ParseFilePipeBuilder,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CustomUploadFileTypeValidatorOptions } from '../../common/validators/files/CustomUploadFileTypeValidator';
import { ChangePassword } from '../auth/dto/change-password.dto';
import { UpdateProfile } from './dto/update-profile.dto';
import { UsersService } from './users.service';
import { VALID_IMAGE_MIME_TYPES } from '../../utils/constants/files/mime-types';
import { MAX_SIZE_IN_BYTES_UPLOAD_PHOTO } from '../../utils/constants/uploads/max-size-upload';

@Controller()
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(AuthGuard)
  @Get('users')
  async list() {
    return this.usersService.findAll();
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() req: any) {
    const user = req.user;

    return user;
  }

  @UseGuards(AuthGuard)
  @Patch('update-profile')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  async updateProfile(
    @Req() req: any,
    @Body() updateProfileDto: UpdateProfile,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addValidator(
          new CustomUploadFileTypeValidatorOptions({
            fileType: VALID_IMAGE_MIME_TYPES,
          }),
        )
        .addMaxSizeValidator({ maxSize: MAX_SIZE_IN_BYTES_UPLOAD_PHOTO })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File,
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto, file);
  }

  @UseGuards(AuthGuard)
  @Patch('change-password')
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePassword,
  ) {
    return await this.usersService.changePassword(
      req.user.id,
      changePasswordDto.password,
    );
  }
}

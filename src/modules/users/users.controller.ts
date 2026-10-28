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
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CustomUploadFileTypeValidatorOptions } from '../../common/validators/files/CustomUploadFileTypeValidator';
import { PaginationDto } from '../../shared/pagination/pagination.dto';
import { SearchDto } from '../../shared/search/search.dto';
import { VALID_IMAGE_MIME_TYPES } from '../../utils/constants/files/mime-types';
import { MAX_SIZE_IN_BYTES_UPLOAD_PHOTO } from '../../utils/constants/uploads/max-size-upload';
import { RoleEnum } from '../../utils/enums/role.enum';
import { ChangePassword } from '../auth/dto/change-password.dto';
import { DeleteAccount } from './dto/delete-account.dto';
import { UpdateProfile } from './dto/update-profile.dto';
import { UpdateUserRole } from './dto/update-user-role.dto';
import { UsersService } from './users.service';
import { AuthenticatedRequest } from '../../common/auth/authenticated-request';

@Controller()
@ApiBearerAuth()
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  async list(@Query() search: SearchDto, @Query() pagination: PaginationDto) {
    return this.usersService.findAll(
      search.q,
      pagination.page,
      pagination.limit,
    );
  }

  @Patch('users/:id/role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleEnum.SUPERADMIN)
  async updateRole(
    @Param('id') id: string,
    @Body() updateUserRole: UpdateUserRole,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.updateRole(
      id,
      updateUserRole.usr_role,
      req.user.id,
    );
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Req() req: AuthenticatedRequest) {
    return req.user;
  }

  @UseGuards(AuthGuard)
  @Patch('update-profile')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE_IN_BYTES_UPLOAD_PHOTO },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
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
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePassword,
  ) {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  @UseGuards(AuthGuard)
  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @Req() req: AuthenticatedRequest,
    @Body() deleteAccount: DeleteAccount,
  ) {
    await this.usersService.deleteAccount(req.user.id, deleteAccount.password);
  }
}

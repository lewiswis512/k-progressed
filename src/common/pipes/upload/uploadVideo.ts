import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';
import { CustomUploadFileTypeValidatorOptions } from 'src/common/validators/files/CustomUploadFileTypeValidator';
import { VALID_VIDEO_MIME_TYPES } from 'src/utils/constants/files/mime-types';
import { MAX_SIZE_IN_BYTES_UPLOAD_VIDEO } from 'src/utils/constants/uploads/max-size-upload';

interface IUploadVideoOptions {
  fileIsRequired?: boolean;
}

export const uploadVideo = (options: IUploadVideoOptions = {}) => {
  const { fileIsRequired } = options;

  return new ParseFilePipeBuilder()
    .addValidator(
      new CustomUploadFileTypeValidatorOptions({
        fileType: VALID_VIDEO_MIME_TYPES,
      }),
    )
    .addMaxSizeValidator({ maxSize: MAX_SIZE_IN_BYTES_UPLOAD_VIDEO })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      fileIsRequired,
    });
};

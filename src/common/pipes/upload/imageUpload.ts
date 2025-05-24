import { HttpStatus, ParseFilePipeBuilder } from '@nestjs/common';
import { CustomUploadFileTypeValidatorOptions } from '../../validators/files/CustomUploadFileTypeValidator';
import { VALID_IMAGE_MIME_TYPES } from '../../../utils/constants/files/mime-types';
import { MAX_SIZE_IN_BYTES_UPLOAD_PHOTO } from '../../../utils/constants/uploads/max-size-upload';

interface ImageUploadOptions {
  fileIsRequired?: boolean;
}

export const imageUpload = (options: ImageUploadOptions = {}) => {
  const { fileIsRequired } = options;

  return new ParseFilePipeBuilder()
    .addValidator(
      new CustomUploadFileTypeValidatorOptions({
        fileType: VALID_IMAGE_MIME_TYPES,
      }),
    )
    .addMaxSizeValidator({ maxSize: MAX_SIZE_IN_BYTES_UPLOAD_PHOTO })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      fileIsRequired,
    });
};

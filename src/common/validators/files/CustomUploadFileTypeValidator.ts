import { FileValidator } from '@nestjs/common';
import { detectMediaKind } from './file-signature';

export interface CustomUploadTypeValidatorOptions {
  fileType: string[];
}

export class CustomUploadFileTypeValidatorOptions extends FileValidator {
  private allowedMimeTypes: string[];

  constructor(
    protected readonly validationOptions: CustomUploadTypeValidatorOptions,
  ) {
    super(validationOptions);
    this.allowedMimeTypes = this.validationOptions.fileType;
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file || !file.mimetype) return false;

    return (
      this.allowedMimeTypes.includes(file.mimetype) &&
      detectMediaKind(file.buffer) === file.mimetype.split('/')[0]
    );
  }

  buildErrorMessage(): string {
    return `Upload not allowed. Upload only files of type: ${this.allowedMimeTypes.join(', ')}`;
  }
}

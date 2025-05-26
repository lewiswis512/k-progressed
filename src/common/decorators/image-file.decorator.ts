import { UploadedFile } from '@nestjs/common';
import { imageUpload } from '../pipes/upload/imageUpload';

interface ImageFileOptions {
  fileIsRequired?: boolean;
}

export function ImageFile(options: ImageFileOptions = {}) {
  return UploadedFile(imageUpload(options));
}

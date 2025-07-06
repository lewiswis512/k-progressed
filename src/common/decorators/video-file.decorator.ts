import { UploadedFile } from '@nestjs/common';
import { uploadVideo } from '../pipes/upload/uploadVideo';

interface videoFileOptions {
  fileIsRequired?: boolean;
}

export function videoFile(options: videoFileOptions = {}) {
  return UploadedFile(uploadVideo(options));
}

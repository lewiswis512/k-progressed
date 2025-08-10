import { CloudinaryUploadStrategy } from './cloudinary-upload-strategy';
import { MulterVideoUploadStrategy } from './multer-video-upload-strategy';
import { VideoUploaderContext } from './video-uploader-context';

export const videoUploaderProvider = new VideoUploaderContext(
  new MulterVideoUploadStrategy(),
);

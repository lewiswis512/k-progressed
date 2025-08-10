import { VideoUploadStrategy } from './video-upload-strategy';

export class VideoUploaderContext {
  constructor(private strategy: VideoUploadStrategy) {}

  setStrategy(strategy: VideoUploadStrategy) {
    this.strategy = strategy;
  }

  async uploadVideo(
    file: Express.Multer.File,
    destination: string,
  ): Promise<{
    secure_url: string;
  }> {
    return this.strategy.uploadVideo(file, destination);
  }
}

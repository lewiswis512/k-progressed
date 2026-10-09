import { IUploadedVideo, IVideoUploader } from './video-upload.interface';

export class VideoUploadStrategy {
  constructor(private strategy: IVideoUploader) {}

  setStrategy(strategy: IVideoUploader) {
    this.strategy = strategy;
  }

  async upload(
    file: Express.Multer.File,
    destination: string,
  ): Promise<IUploadedVideo> {
    return await this.strategy.upload(file, destination);
  }
}

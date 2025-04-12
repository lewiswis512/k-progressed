import { VideoUploadStrategy } from './video-upload-strategy';

export class VideoUploaderContext<TInput, TResult> {
  constructor(private strategy: VideoUploadStrategy<TInput, TResult>) {}

  setStrategy(strategy: VideoUploadStrategy<TInput, TResult>) {
    this.strategy = strategy;
  }

  async uploadVideo(file: TInput, destination: string): Promise<TResult> {
    return this.strategy.uploadVideo(file, destination);
  }
}

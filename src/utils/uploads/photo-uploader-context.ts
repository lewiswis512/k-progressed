import { PhotoUploadStrategy } from './photo-upload-strategy';

export class PhotoUploaderContext<TInput, TResult> {
  constructor(private strategy: PhotoUploadStrategy<TInput, TResult>) {}

  setStrategy(strategy: PhotoUploadStrategy<TInput, TResult>) {
    this.strategy = strategy;
  }

  async upload(file: TInput, destination: string): Promise<TResult> {
    return this.strategy.upload(file, destination);
  }
}

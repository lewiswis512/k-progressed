import { UploadStrategy } from './strategy';

export class UploaderContext<TInput, TResult> {
  constructor(private strategy: UploadStrategy<TInput, TResult>) {}

  //   setStrategy(strategy: UploadStrategy<TInput, TResult>) {
  //     this.strategy = strategy;
  //   }

  async upload(file: TInput, destination: string): Promise<TResult> {
    return this.strategy.upload(file, destination);
  }
}

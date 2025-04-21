export interface PhotoUploadStrategy<TInput = any, TResult = any> {
  upload(file: TInput, destination: string): Promise<TResult>;
}

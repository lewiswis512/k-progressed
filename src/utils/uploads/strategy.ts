export interface UploadStrategy<TInput = any, TResult = any> {
  upload(file: TInput, destination: string): Promise<TResult>;
}

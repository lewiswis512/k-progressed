export interface PhotoUploadStrategy<TInput = any, TResult = any> {
  getPublicIdFromUrl(url: string): string;
  upload(file: TInput, destination: string): Promise<TResult>;
  delete(publicId: string): Promise<void>;
}

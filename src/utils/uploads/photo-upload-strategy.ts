export interface PhotoUploadStrategy<TInput = any, TResult = any> {
  upload(file: TInput, destination: string): Promise<TResult>;
  // getPublicIdFromUrl(url: string): string;
  delete(publicId: string): Promise<void>;
}

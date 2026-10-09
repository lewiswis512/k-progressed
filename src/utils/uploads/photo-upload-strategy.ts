export interface PhotoUploadStrategy<TInput = Buffer, TResult = string> {
  getPublicIdFromUrl(url: string): string;
  upload(file: TInput, destination: string): Promise<TResult>;
  delete(publicId: string): Promise<void>;
}

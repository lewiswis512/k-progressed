export interface VideoUploadStrategy<
  TInput = any,
  TResult = { secure_url: string; thumbnail?: string },
> {
  uploadVideo(file: TInput, destination: string): Promise<TResult>;
}

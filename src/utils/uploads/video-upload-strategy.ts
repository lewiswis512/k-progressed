export interface VideoUploadStrategy<TResult = { secure_url: string }> {
  uploadVideo(file: Express.Multer.File, destination: string): Promise<TResult>;
  delete(publicId: string): Promise<void>;
}

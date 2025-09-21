export interface IVideoUploader<TResult = { path: string }> {
  upload(file: Express.Multer.File, destination: string): Promise<TResult>;
}

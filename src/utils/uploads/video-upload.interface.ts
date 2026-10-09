export interface IUploadedVideo {
  path: string;
  thumbnail: string;
  duration: number;
}

export interface IVideoUploader<TResult = IUploadedVideo> {
  upload(file: Express.Multer.File, destination: string): Promise<TResult>;
}

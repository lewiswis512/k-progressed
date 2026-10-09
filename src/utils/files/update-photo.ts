import { PhotoUploadStrategy } from '../uploads/photo-upload-strategy';
import { PhotoUploaderContext } from '../uploads/photo-uploader-context';

interface IUpdatePhoto<TInput, TResult> {
  photoPath?: string;
  fileInput: TInput;
  uploadPath: string;
  photoUploadStrategy: PhotoUploadStrategy<TInput, TResult>;
}

export const updatePhoto = async <TInput = Buffer, TResult = string>({
  photoPath,
  fileInput,
  uploadPath,
  photoUploadStrategy,
}: IUpdatePhoto<TInput, TResult>): Promise<TResult> => {
  const context = new PhotoUploaderContext(photoUploadStrategy);

  if (photoPath) {
    const publicId = photoUploadStrategy.getPublicIdFromUrl(photoPath);
    await photoUploadStrategy.delete(publicId).catch((): null => null);
  }

  const newPhoto = await context.upload(fileInput, uploadPath);

  return newPhoto;
};

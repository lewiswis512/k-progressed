import { PhotoUploadStrategy } from '../uploads/photo-upload-strategy';
import { PhotoUploaderContext } from '../uploads/photo-uploader-context';

interface IUpdatePhoto<TInput = any, TResult = any> {
  photoPath?: string;
  fileInput: TInput;
  uploadPath: string;
  photoUploadStrategy: PhotoUploadStrategy<TInput, TResult>;
}

export const updatePhoto = async ({
  photoPath,
  fileInput,
  uploadPath,
  photoUploadStrategy,
}: IUpdatePhoto) => {
  const context = new PhotoUploaderContext(photoUploadStrategy);

  if (photoPath) {
    const publicId = photoUploadStrategy.getPublicIdFromUrl(photoPath);
    await photoUploadStrategy.delete(publicId);
  }

  const newPhoto = await context.upload(fileInput, uploadPath);

  return newPhoto;
};

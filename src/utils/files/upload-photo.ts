import { PhotoUploadStrategy } from '../uploads/photo-upload-strategy';
import { PhotoUploaderContext } from '../uploads/photo-uploader-context';

interface IUploadPhoto<TInput = any> {
  photoUploadStrategy: PhotoUploadStrategy;
  uploadPath: string;
  fileInput: TInput;
}

export const uploadPhoto = async ({
  photoUploadStrategy,
  uploadPath,
  fileInput,
}: IUploadPhoto) => {
  const cloudinaryContext = new PhotoUploaderContext(photoUploadStrategy);

  const photoLink: string = await cloudinaryContext.upload(
    fileInput,
    uploadPath,
  );

  return photoLink;
};

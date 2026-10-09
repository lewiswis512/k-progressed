import { PhotoUploadStrategy } from '../uploads/photo-upload-strategy';
import { PhotoUploaderContext } from '../uploads/photo-uploader-context';

interface IUploadPhoto<TInput> {
  photoUploadStrategy: PhotoUploadStrategy<TInput, string>;
  uploadPath: string;
  fileInput: TInput;
}

export const uploadPhoto = async <TInput = Buffer>({
  photoUploadStrategy,
  uploadPath,
  fileInput,
}: IUploadPhoto<TInput>): Promise<string> => {
  const cloudinaryContext = new PhotoUploaderContext(photoUploadStrategy);

  const photoLink: string = await cloudinaryContext.upload(
    fileInput,
    uploadPath,
  );

  return photoLink;
};

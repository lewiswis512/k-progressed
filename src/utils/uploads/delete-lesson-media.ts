import { CloudinaryUploadStrategy } from './cloudinary-upload-strategy';
import { CloudinaryVideoUploadStrategy } from './cloudinary-video-upload-strategy';

interface ILessonMedia {
  lssn_video_link?: string;
  lssn_video_photo?: string;
}

export const deleteLessonMedia = async (lesson: ILessonMedia): Promise<void> => {
  await new CloudinaryVideoUploadStrategy().delete(lesson.lssn_video_link);

  if (lesson.lssn_video_photo?.includes('/image/upload/')) {
    const photoStrategy = new CloudinaryUploadStrategy();

    await photoStrategy.delete(
      photoStrategy.getPublicIdFromUrl(lesson.lssn_video_photo),
    );
  }
};

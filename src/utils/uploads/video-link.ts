import { PATH_UPLOAD_LESSON_VIDEOS } from '../constants/uploads/path-upload';

export const videoLink = (videoPath: string) => {
  let videoLink: string = '';

  if (videoPath.startsWith('https') || videoPath.startsWith('http')) {
    videoLink = videoPath;
  } else {
    videoLink = `${PATH_UPLOAD_LESSON_VIDEOS}/${videoPath}`;
  }

  return videoLink;
};

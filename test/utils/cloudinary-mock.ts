import { cloudinaryPublicIdFromUrl } from '../../src/utils/uploads/cloudinary-public-id';

export const cloudinaryPhotoMock = {
  upload: jest.fn(
    async (_buffer: Buffer, destination: string) =>
      `https://res.cloudinary.com/test-cloud/image/upload/v1/${destination}/photo-test.jpg`,
  ),
  delete: jest.fn(async (_target: string): Promise<void> => undefined),
};

export const cloudinaryVideoMock = {
  upload: jest.fn(async (_file: Express.Multer.File, destination: string) => ({
    path: `https://res.cloudinary.com/test-cloud/video/upload/v1/${destination}/video-test.mp4`,
    thumbnail: `https://res.cloudinary.com/test-cloud/video/upload/v1/${destination}/video-test.jpg`,
    duration: 125,
  })),
  delete: jest.fn(async (_target: string): Promise<void> => undefined),
};

export class MockCloudinaryUploadStrategy {
  upload(buffer: Buffer, destination: string) {
    return cloudinaryPhotoMock.upload(buffer, destination);
  }

  delete(publicId: string) {
    return cloudinaryPhotoMock.delete(publicId);
  }

  getPublicIdFromUrl(url: string) {
    return cloudinaryPublicIdFromUrl(url);
  }
}

export class MockCloudinaryVideoUploadStrategy {
  upload(file: Express.Multer.File, destination: string) {
    return cloudinaryVideoMock.upload(file, destination);
  }

  delete(url: string) {
    return cloudinaryVideoMock.delete(url);
  }
}

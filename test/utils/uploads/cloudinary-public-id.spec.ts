import { cloudinaryPublicIdFromUrl } from '../../../src/utils/uploads/cloudinary-public-id';

describe('cloudinaryPublicIdFromUrl', () => {
  it.each([
    [
      'https://res.cloudinary.com/demo/image/upload/v1712345678/k-progressed/courses/abc123.jpg',
      'k-progressed/courses/abc123',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/k-progressed/users/photo.png',
      'k-progressed/users/photo',
    ],
    [
      'https://res.cloudinary.com/demo/video/upload/v1/k-progressed/lessons/video.mp4',
      'k-progressed/lessons/video',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_200,h_200/v12/folder/pic.webp',
      'folder/pic',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/s--AbCdEf12--/v12/folder/signed.jpg',
      'folder/signed',
    ],
    [
      'https://res.cloudinary.com/demo/image/private/v3/secret/file.jpg',
      'secret/file',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/v1/folder/with%20space.jpg',
      'folder/with space',
    ],
    [
      'https://res.cloudinary.com/demo/image/upload/v1/folder/no-extension',
      'folder/no-extension',
    ],
  ])('should extract the public id of %s', (url, publicId) => {
    expect(cloudinaryPublicIdFromUrl(url)).toBe(publicId);
  });

  it('should fall back to the file name for other urls', () => {
    expect(
      cloudinaryPublicIdFromUrl('https://example.com/some/path/file.jpg'),
    ).toBe('file');
  });
});

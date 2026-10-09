import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as dotenv from 'dotenv';
import { Readable } from 'stream';
import { cloudinaryPublicIdFromUrl } from './cloudinary-public-id';
import { IUploadedVideo, IVideoUploader } from './video-upload.interface';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryVideoUploadStrategy implements IVideoUploader {
  async upload(
    file: Express.Multer.File,
    destination: string,
  ): Promise<IUploadedVideo> {
    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: destination,
          resource_type: 'video',
          transformation: [
            { width: 1280, height: 720, crop: 'limit' },
            { quality: 'auto:eco' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });

    return {
      path: result.secure_url,
      duration: Number(result.duration ?? 0),
      thumbnail: cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        secure: true,
        version: result.version,
        transformation: [{ start_offset: 1, width: 1280, crop: 'limit' }],
      }),
    };
  }

  async delete(url: string): Promise<void> {
    if (!url?.startsWith('http')) {
      return;
    }

    await cloudinary.uploader.destroy(cloudinaryPublicIdFromUrl(url), {
      resource_type: 'video',
      invalidate: true,
    });
  }
}

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as dotenv from 'dotenv';
import { PhotoUploadStrategy } from './photo-upload-strategy';
import * as _ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export class CloudinaryUploadStrategy implements PhotoUploadStrategy {
  async upload(fileBuffer: Buffer, destination: string): Promise<string> {
    try {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { destination, resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        Readable.from(fileBuffer).pipe(uploadStream);
      });

      return result.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw new Error('Cloudinary upload failed');
    }
  }

  async delete(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new Error('Cloudinary delete failed');
    }
  }

  getPublicIdFromUrl(url: string): string {
    const urlSpitted = url.split('/');
    const uploadFolder = urlSpitted[urlSpitted.length - 2];
    const filename = urlSpitted[urlSpitted.length - 1].split('.')[0];

    return `${uploadFolder}/${filename}`;
  }
}

import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as dotenv from 'dotenv';
import { PhotoUploadStrategy } from './photo-upload-strategy';
import { cloudinaryPublicIdFromUrl } from './cloudinary-public-id';
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
          { folder: destination, resource_type: 'image' },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        Readable.from(fileBuffer).pipe(uploadStream);
      });

      return result.secure_url;
    } catch (error) {
      throw new Error('Cloudinary upload failed');
    }
  }

  async delete(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    } catch (error) {
      throw new Error('Cloudinary delete failed');
    }
  }

  getPublicIdFromUrl(url: string): string {
    return cloudinaryPublicIdFromUrl(url);
  }
}

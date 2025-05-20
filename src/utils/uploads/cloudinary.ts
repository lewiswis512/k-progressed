import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as dotenv from 'dotenv';
import { Readable } from 'stream';
import { PhotoUploadStrategy } from './photo-upload-strategy';
import { VideoUploadStrategy } from './video-upload-strategy';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import * as _ffmpeg from 'fluent-ffmpeg';
const ffmpeg = _ffmpeg.default;

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const unlinkAsync = promisify(fs.unlink);

export class CloudinaryUploadStrategy
  implements
    PhotoUploadStrategy<Buffer, string>,
    VideoUploadStrategy<Buffer, { secure_url: string; thumbnail?: string }>
{
  async upload(fileBuffer: Buffer, folder: string): Promise<string> {
    try {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder, resource_type: 'image' },
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

  async uploadVideo(
    fileBuffer: Buffer,
    folder: string,
  ): Promise<{ secure_url: string; thumbnail?: string }> {
    try {
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'video',
            transformation: [
              { width: 1280, height: 720, crop: 'limit' },
              { quality: 'auto:eco' },
            ],
            eager: [
              {
                format: 'jpg',
                transformation: [
                  { width: 320, height: 180, crop: 'thumb', gravity: 'auto' },
                ],
              },
            ],
            eager_async: true,
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );

        Readable.from(fileBuffer).pipe(uploadStream);
      });

      return {
        secure_url: result.secure_url,
        thumbnail: result.eager?.[0]?.secure_url,
      };
    } catch (error) {
      console.error('Cloudinary video upload error:', error);
      throw new Error('Cloudinary video upload failed');
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

  async takeScreenshot(videoUrl: string, folder: string): Promise<string> {
    try {
      const screenshotFilename = `screenshot-${Date.now()}.png`;
      const localScreenshotPath = path.join('/tmp', screenshotFilename);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoUrl)
          .screenshots({
            timestamps: ['00:00:01'],
            filename: screenshotFilename,
            folder: '/tmp',
          })
          .on('end', resolve as unknown as () => void)
          .on('error', (err: Error) => reject(`FFmpeg error: ${err.message}`));
      });

      const screenshotUpload: UploadApiResponse = await new Promise(
        (resolve, reject) => {
          cloudinary.uploader.upload(
            localScreenshotPath,
            {
              folder,
              resource_type: 'image',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result!);
            },
          );
        },
      );

      await unlinkAsync(localScreenshotPath);

      return screenshotUpload.secure_url;
    } catch (error) {
      console.error('uploadVideoWithScreenshot error:', error);
      throw new Error('Failed to upload video and screenshot to Cloudinary.');
    }
  }
}

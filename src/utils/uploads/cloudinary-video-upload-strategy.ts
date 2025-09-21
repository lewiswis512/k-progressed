import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as dotenv from 'dotenv';
import * as _ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { promisify } from 'util';
const ffmpeg = _ffmpeg.default;

import { readFile, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { IDeleteVideoUploaded } from './delete-video-uploaded.interface';
import { IVideoUploader } from './video-upload.interface';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const unlinkAsync = promisify(fs.unlink);

export class CloudinaryVideoUploadStrategy
  implements IVideoUploader<{ path: string }>, IDeleteVideoUploaded
{
  async upload(
    file: Express.Multer.File,
    destination: string,
  ): Promise<{ path: string }> {
    try {
      const compressedBuffer = await this.compressVideo(file.buffer);

      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            destination,
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

        Readable.from(compressedBuffer).pipe(uploadStream);
      });

      return {
        path: result.secure_url,
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

  compressVideo(inputBuffer: Buffer): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const inputPath = join(tmpdir(), `${uuidv4()}.mp4`);
      const outputPath = join(tmpdir(), `${uuidv4()}-compressed.mp4`);

      try {
        await writeFile(inputPath, inputBuffer);

        ffmpeg(inputPath)
          .outputOptions(['-vcodec libx264', '-crf 28', '-preset fast'])
          .on('end', async () => {
            try {
              const compressedBuffer = await readFile(outputPath);
              await unlink(inputPath);
              await unlink(outputPath);
              resolve(compressedBuffer);
            } catch (readErr) {
              reject(readErr);
            }
          })
          .on('error', (err) => {
            reject(err);
          })
          .save(outputPath);
      } catch (err) {
        reject(err);
      }
    });
  }
}

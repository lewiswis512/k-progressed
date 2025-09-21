import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as _ffmpeg from 'fluent-ffmpeg';
const ffmpeg = _ffmpeg.default;
import path from 'path';
import { promisify } from 'util';
import fs from 'fs';
const unlinkAsync = promisify(fs.unlink);

export class ScreenShot {
  async takeFrom(videoUrl: string, folder: string): Promise<string> {
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

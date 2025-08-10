import { VideoUploadStrategy } from './video-upload-strategy';
import { Vimeo } from '@vimeo/vimeo';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

export class VimeoVideoUploadStrategy
  implements VideoUploadStrategy<{ secure_url: string }>
{
  private vimeo: Vimeo;

  constructor() {
    this.vimeo = new Vimeo(
      process.env.VIMEO_CLIENT_ID,
      process.env.VIMEO_CLIENT_SECRET,
      process.env.VIMEO_TOKEN,
    );
  }

  writeFile = promisify(fs.writeFile);
  unlink = promisify(fs.unlink);

  async uploadVideo(
    file: Express.Multer.File,
    destination: string,
  ): Promise<any> {
    console.log({ vimeo: this.vimeo });

    const tempDir = path.resolve(__dirname, '..', '..', 'temp');
    const tempPath = path.join(tempDir, `${Date.now()}-${file.originalname}`);

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    await this.writeFile(tempPath, file.buffer);

    const data = new Promise((resolve, reject) => {
      this.vimeo.upload(
        tempPath,
        {
          name: file.originalname,
          description: `Uploaded to ${destination}`,
        },
        async (uri) => {
          const videoId = uri.split('/').pop();
          const videoUrl = `https://vimeo.com/${videoId}`;

          await this.unlink(tempPath);

          resolve({ secure_url: videoUrl });
        },
        undefined,
        async (err) => {
          console.error('Upload to Vimeo failed', err);
          await this.unlink(tempPath);
          reject(err);
        },
      );
    });

    console.log({ data: await data });

    return await data;
  }

  getPublicIdFromUrl(url: string): string {
    const match = url.match(/vimeo\.com\/(\d+)/);
    return match?.[1] || '';
  }

  async delete(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.vimeo.request(
        {
          method: 'DELETE',
          path: `/videos/${publicId}`,
        },
        (error) => {
          if (error) return reject(error);
          resolve();
        },
      );
    });
  }
}

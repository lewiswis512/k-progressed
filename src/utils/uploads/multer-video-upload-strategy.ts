import { extname, join } from 'path';
import * as fs from 'fs';
import { slugify } from '../slugify';
import { VideoUploadStrategy } from './video-upload-strategy';

export class MulterVideoUploadStrategy implements VideoUploadStrategy {
  async uploadVideo(
    file: Express.Multer.File,
    destination: string,
  ): Promise<{ secure_url: string }> {
    const [basename] = file.originalname.split('.');
    const extension: string = extname(file.originalname);
    const randomName: string = Array(10)
      .fill(null)
      .map(() => Math.round(Math.random() * 8).toString(8))
      .join('');
    const filename: string = slugify(`${basename}-${randomName}${extension}`);
    const fullPath: string = join(destination, filename);

    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    fs.writeFileSync(fullPath, file.buffer);

    return { secure_url: filename };
  }

  async delete(publicId: string): Promise<void> {}
}

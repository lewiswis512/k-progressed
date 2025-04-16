import { Readable } from 'stream';
import * as _ffmpeg from 'fluent-ffmpeg';
const ffmpeg = _ffmpeg.default;

interface IVideoLink {
  filename: string;
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  stream: Readable;
  destination: string;
  path: string;
  buffer: Buffer;
}

function isIVideoLink(obj: any): obj is IVideoLink {
  return (
    typeof obj === 'object' && obj !== null && typeof obj.path === 'string'
  );
}

function isExternalUrl(link: string): boolean {
  return /^https?:\/\//.test(link);
}

export async function videoScreenShot(
  videoLink: IVideoLink | string,
  prefixFilename: string,
  destination: string,
): Promise<string> {
  const randomName: string = Array(10)
    .fill(null)
    .map(() => Math.round(Math.random() * 8).toString(8))
    .join('');

  const photoFilename = `${prefixFilename}-${randomName}.png`;

  const sourcePath = isIVideoLink(videoLink)
    ? videoLink.path
    : isExternalUrl(videoLink)
      ? videoLink
      : null;

  if (!sourcePath) {
    throw new Error('Invalid videoLink: must be a local file or external URL.');
  }

  await new Promise<void>((resolve, reject) => {
    ffmpeg(sourcePath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: photoFilename,
        folder: destination,
      })
      .on('end', () => resolve())
      .on('error', (err: Error) =>
        reject(`Error capturing screenshot: ${err.message}`),
      );
  });

  return photoFilename;
}

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean =>
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, index) => buffer[offset + index] === byte);

const ascii = (buffer: Buffer, start: number, end: number): string =>
  buffer.length >= end ? buffer.subarray(start, end).toString('ascii') : '';

export type MediaKind = 'image' | 'video';

export const detectMediaKind = (buffer?: Buffer): MediaKind | null => {
  if (!buffer || buffer.length < 12) {
    return null;
  }

  if (
    startsWith(buffer, [0xff, 0xd8, 0xff]) ||
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) ||
    (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP')
  ) {
    return 'image';
  }

  if (
    (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'AVI ') ||
    ascii(buffer, 4, 8) === 'ftyp' ||
    startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]) ||
    startsWith(buffer, [0x00, 0x00, 0x01, 0xba]) ||
    startsWith(buffer, [0x00, 0x00, 0x01, 0xb3])
  ) {
    return 'video';
  }

  return null;
};

export const hasKnownMediaSignature = (buffer?: Buffer): boolean => {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  return (
    startsWith(buffer, [0xff, 0xd8, 0xff]) ||
    startsWith(buffer, [0x89, 0x50, 0x4e, 0x47]) ||
    (ascii(buffer, 0, 4) === 'RIFF' &&
      ['WEBP', 'AVI '].includes(ascii(buffer, 8, 12))) ||
    ascii(buffer, 4, 8) === 'ftyp' ||
    startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]) ||
    startsWith(buffer, [0x00, 0x00, 0x01, 0xba]) ||
    startsWith(buffer, [0x00, 0x00, 0x01, 0xb3])
  );
};

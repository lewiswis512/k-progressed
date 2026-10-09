import { hasKnownMediaSignature } from '../../../../src/common/validators/files/file-signature';

const pad = (head: number[] | Buffer, size = 16) => {
  const start = Buffer.isBuffer(head) ? head : Buffer.from(head);

  return Buffer.concat([start, Buffer.alloc(Math.max(0, size - start.length))]);
};

describe('hasKnownMediaSignature', () => {
  it.each([
    ['jpeg', pad([0xff, 0xd8, 0xff, 0xe0])],
    ['png', pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['webp', pad(Buffer.from('RIFF\x00\x00\x00\x00WEBPVP8 ', 'binary'))],
    ['avi', pad(Buffer.from('RIFF\x00\x00\x00\x00AVI LIST', 'binary'))],
    ['mp4 / mov', pad(Buffer.from('\x00\x00\x00\x18ftypmp42', 'binary'))],
    ['webm / mkv', pad([0x1a, 0x45, 0xdf, 0xa3])],
    ['mpeg program stream', pad([0x00, 0x00, 0x01, 0xba])],
    ['mpeg video stream', pad([0x00, 0x00, 0x01, 0xb3])],
  ])('should accept a %s file', (_label, buffer) => {
    expect(hasKnownMediaSignature(buffer)).toBe(true);
  });

  it.each([
    ['text', Buffer.from('<?php system($_GET["c"]); ?>')],
    ['pdf', pad(Buffer.from('%PDF-1.7'))],
    ['svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')],
    ['riff wave', pad(Buffer.from('RIFF\x00\x00\x00\x00WAVEfmt ', 'binary'))],
    ['zip', pad([0x50, 0x4b, 0x03, 0x04])],
  ])('should reject a %s file', (_label, buffer) => {
    expect(hasKnownMediaSignature(buffer)).toBe(false);
  });

  it('should reject a missing or too short buffer', () => {
    expect(hasKnownMediaSignature(undefined)).toBe(false);
    expect(hasKnownMediaSignature(Buffer.from([0xff, 0xd8, 0xff]))).toBe(false);
    expect(hasKnownMediaSignature(Buffer.alloc(0))).toBe(false);
  });
});

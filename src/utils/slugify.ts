import slugifyLib from 'slugify';

export const slugify = (value: string): string => {
  return slugifyLib(value, {
    replacement: '-',
    remove: /[_]/g,
    lower: true,
    strict: false,
    trim: true,
  });
};

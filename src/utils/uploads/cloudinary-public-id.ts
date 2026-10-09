export const cloudinaryPublicIdFromUrl = (url: string): string => {
  const match = url.match(
    /\/(?:image|video|raw)\/(?:upload|authenticated|private)\/(?:s--[^/]+--\/)?(?:[^/]*,[^/]*\/)*(?:v\d+\/)?(.+?)(?:\.[a-z0-9]+)?$/i,
  );

  if (match) {
    return decodeURIComponent(match[1]);
  }

  const segments = url.split('/');

  return segments[segments.length - 1].split('.')[0];
};

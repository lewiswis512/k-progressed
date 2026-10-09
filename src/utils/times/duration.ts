export const getHourMinuteSecond = (duration: number = null): string => {
  if (duration === null) return null;

  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);

  return `${hours}:${minutes}:${seconds}`;
};

export const getHourMinute = (duration: number = null): string | number => {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (hours !== 0 && minutes !== 0) {
    return `${hours} h ${minutes} min`;
  }

  return duration;
};

export const getMinute = (duration: number = null): string | number => {
  const minutes = Math.floor((duration % 3600) / 60);

  if (minutes !== 0) {
    return `${minutes} min`;
  }

  return duration;
};

export const getMinuteAndSecond = (
  duration: number | null = null,
): string | null => {
  if (duration === null) return null;

  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60)
    .toString()
    .padStart(2, '0');

  return `${minutes}:${seconds}`;
};

export const getSecond = (
  duration: number | null = null,
): string | number | null => {
  if (duration === null) return null;

  const seconds = Math.floor(duration % 60)
    .toString()
    .padStart(2, '0');

  const secondLetter = duration > 0 ? `${seconds} seconds` : 0;

  return secondLetter;
};

export const formatLessonDuration = (duration: number): string => {
  return getMinuteAndSecond(duration > 0 ? duration : 0);
};

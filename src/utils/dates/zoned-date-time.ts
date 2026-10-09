const offsetInMilliseconds = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute),
    Number(value.second),
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
};

export const zonedDateTimeToUtc = (
  date: string,
  time: string,
  timeZone: string,
): Date => {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes);
  const firstOffset = offsetInMilliseconds(new Date(utcGuess), timeZone);
  const candidate = utcGuess - firstOffset;
  const secondOffset = offsetInMilliseconds(new Date(candidate), timeZone);

  return new Date(utcGuess - secondOffset);
};

export const dayOfWeek = (date: string): number => {
  const [year, month, day] = date.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

export const formatZonedDateTime = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);

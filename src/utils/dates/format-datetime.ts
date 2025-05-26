export const formatDateTime = (date: Date, country: string = 'fr-FR') => {
  const formatter = new Intl.DateTimeFormat(country, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  });

  const dateParts = formatter.formatToParts(date);

  const year = dateParts.find((p) => p.type === 'year')?.value;
  const month = dateParts.find((p) => p.type === 'month')?.value;
  const day = dateParts.find((p) => p.type === 'day')?.value;
  const hour = dateParts.find((p) => p.type === 'hour')?.value;
  const minute = dateParts.find((p) => p.type === 'minute')?.value;

  return `${year}-${month}-${day} ${hour}:${minute}`;
};

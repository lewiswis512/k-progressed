export const dateTimeFormatted = (date: Date, country: string = "fr-FR") => {
  const dateTimeFormat = new Intl.DateTimeFormat(country, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);

  return dateTimeFormat.charAt(0).toUpperCase() + dateTimeFormat.slice(1);
};

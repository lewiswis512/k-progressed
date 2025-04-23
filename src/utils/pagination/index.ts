export const pagination = <T>(data: T[], page: number, limit: number): T[] => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  return data.slice(startIndex, endIndex);
};

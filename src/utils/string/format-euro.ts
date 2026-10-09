export const formatEuro = (amount: number): string =>
  new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(
    Number(amount ?? 0),
  );

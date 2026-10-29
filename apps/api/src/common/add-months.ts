// Clamps to the last day of the target month: 29 Feb + 12 months = 28 Feb.
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const originalDay = date.getUTCDate();

  result.setUTCMonth(result.getUTCMonth() + months);

  if (result.getUTCDate() !== originalDay) {
    result.setUTCDate(0);
  }

  return result;
}

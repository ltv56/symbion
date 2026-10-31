export function formatPoints(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatVnd(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

// English spells the month
export function formatDate(value: string | Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = locale.startsWith('en')
    ? { dateStyle: 'medium' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

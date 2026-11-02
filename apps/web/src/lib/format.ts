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

// The sign is part of the figure: "+" and "−" (U+2212)
export function signed(value: number, format: (n: number) => string): string {
  if (value === 0) return format(0);
  return `${value > 0 ? '+' : '−'}${format(Math.abs(value))}`;
}

// English spells the month
export function formatDate(value: string | Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = locale.startsWith('en')
    ? { dateStyle: 'medium' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

// The date and the time of day
export function formatDateTime(value: string | Date, locale: string): string {
  const options: Intl.DateTimeFormatOptions = locale.startsWith('en')
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
  return new Intl.DateTimeFormat(locale, options).format(new Date(value));
}

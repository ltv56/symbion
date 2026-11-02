// Months are "YYYY-MM", counted in Vietnam time like the api

export function currentMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get('year')}-${get('month')}`;
}

export function shiftMonth(month: string, by: number): string {
  const [year, number] = month.split('-').map(Number) as [number, number];
  const moved = new Date(Date.UTC(year, number - 1 + by, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Newest first
export function recentMonths(count: number, now: Date = new Date()): string[] {
  const latest = currentMonth(now);
  return Array.from({ length: count }, (_, i) => shiftMonth(latest, -i));
}

export function monthLabel(month: string, locale: string): string {
  const [year, number] = month.split('-').map(Number) as [number, number];
  const label = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(Date.UTC(year, number - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// "×1,25": two decimals at most, none when whole
export function formatRate(rate: number, locale: string): string {
  return `×${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rate)}`;
}

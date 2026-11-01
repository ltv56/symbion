const VIETNAM_OFFSET_MS = 7 * 3_600_000;

// Asia/Ho_Chi_Minh is UTC+7 with no DST. Returns the month as a UTC range [start, end).
export function monthPeriod(month: string): { start: Date; end: Date } {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return {
    start: new Date(Date.UTC(year, monthNumber - 1, 1) - VIETNAM_OFFSET_MS),
    end: new Date(Date.UTC(year, monthNumber, 1) - VIETNAM_OFFSET_MS),
  };
}

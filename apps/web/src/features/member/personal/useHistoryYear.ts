import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HistoryEntry } from '../history/useHistory';

const PAGE = 100;
const MAX_PAGES = 10;

export interface YearHistory {
  entries: HistoryEntry[];
  // More entries exist than were read
  truncated: boolean;
}

// The last 12 months of entries, newest first, read page by page
async function fetchYear(): Promise<YearHistory> {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth() - 12, 1).getTime();
  const entries: HistoryEntry[] = [];
  let after: number | undefined;
  let truncated = true;
  for (let page = 0; page < MAX_PAGES; page++) {
    const cursor = after === undefined ? '' : `&after=${after}`;
    const rows = await api<HistoryEntry[]>(
      `/me/history?limit=${PAGE}${cursor}`,
    );
    entries.push(...rows);
    const last = rows[rows.length - 1];
    if (
      !last ||
      rows.length < PAGE ||
      new Date(last.createdAt).getTime() < since
    ) {
      truncated = false;
      break;
    }
    after = last.id;
  }
  return {
    entries: entries.filter(
      (entry) => new Date(entry.createdAt).getTime() >= since,
    ),
    truncated,
  };
}

export function useHistoryYear() {
  return useQuery({ queryKey: ['me', 'history', 'year'], queryFn: fetchYear });
}

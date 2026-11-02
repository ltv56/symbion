import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface HistoryEntry {
  id: number;
  type: 'earn' | 'spend';
  points: number;
  merchantId: number;
  merchantName: string;
  ref: { type: string; id: number } | null;
  expiresAt: string | null;
  createdAt: string;
}

// Fetched only once opened
export function useHistory(enabled: boolean) {
  return useQuery({
    queryKey: ['me', 'history'],
    queryFn: () => api<HistoryEntry[]>('/me/history'),
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Lot {
  id: number;
  merchantId: number;
  merchantName: string;
  remaining: number;
  expiresAt: string | null;
}

export function useLots() {
  return useQuery({
    queryKey: ['me', 'lots'],
    queryFn: () => api<Lot[]>('/me/lots'),
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Me {
  id: number;
  email: string;
  name: string;
  tier: { id: number; name: string };
  balance: number;
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/me') });
}

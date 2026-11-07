import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DemoAccounts = {
  admin: { email: string } | null;
  merchants: { id: number; name: string; apiKey: string }[];
};

// 404 without DEMO_MODE: the hints stay hidden
export function useDemoAccounts() {
  return useQuery({
    queryKey: ['demo-accounts'],
    queryFn: () => api<DemoAccounts>('/demo/accounts'),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

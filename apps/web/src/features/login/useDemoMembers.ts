import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type DemoMember = {
  email: string;
  name: string | null;
  tierName: string;
  balance: number;
};

// 404 without DEMO_MODE: the hint stays hidden
export function useDemoMembers() {
  return useQuery({
    queryKey: ['demo-members'],
    queryFn: () => api<DemoMember[]>('/demo/members'),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

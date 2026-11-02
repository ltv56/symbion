import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Partner {
  id: number;
  name: string;
}

export function usePartners() {
  return useQuery({
    queryKey: ['partners'],
    queryFn: () => api<Partner[]>('/me/partners'),
  });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Tier {
  id: number;
  name: string;
  minSpend: number;
  earnRate: number;
}

export interface TierInput {
  name: string;
  minSpend: number;
  earnRate: number;
}

interface Settings {
  pointValueVnd: number;
}

const SETTINGS = ['admin', 'settings'];
const TIERS = ['admin', 'tiers'];

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS,
    queryFn: () => api<Settings>('/settings', { as: 'admin' }),
  });
}

// The statement shows the value too
export function useUpdatePointValue() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (pointValueVnd: number) =>
      api<Settings>('/settings', {
        method: 'PATCH',
        body: { pointValueVnd },
        as: 'admin',
      }),
    onSuccess: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: SETTINGS }),
        client.invalidateQueries({ queryKey: ['admin', 'statement'] }),
      ]),
  });
}

export function useTiers() {
  return useQuery({
    queryKey: TIERS,
    queryFn: () => api<Tier[]>('/tiers', { as: 'admin' }),
  });
}

export function useCreateTier() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TierInput) =>
      api<Tier>('/tiers', { method: 'POST', body, as: 'admin' }),
    onSuccess: () => client.invalidateQueries({ queryKey: TIERS }),
  });
}

export function useUpdateTier(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: TierInput) =>
      api<Tier>(`/tiers/${id}`, { method: 'PATCH', body, as: 'admin' }),
    onSuccess: () => client.invalidateQueries({ queryKey: TIERS }),
  });
}

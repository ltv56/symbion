import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Merchant {
  id: number;
  name: string;
  photoUrl: string | null;
  address: string | null;
  createdAt: string;
}

// The key is in the answer once; only its hash is stored
export interface IssuedKey {
  id: number;
  name: string;
  apiKey: string;
}

const KEY = ['admin', 'merchants'];

export function useMerchants() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<Merchant[]>('/merchants', { as: 'admin' }),
  });
}

export function useCreateMerchant() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<IssuedKey>('/merchants', {
        method: 'POST',
        body: { name },
        as: 'admin',
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

// null clears a field
export function useUpdateMerchant(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { photoUrl: string | null; address: string | null }) =>
      api<Merchant>(`/merchants/${id}`, {
        method: 'PATCH',
        body,
        as: 'admin',
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRotateKey(id: number) {
  return useMutation({
    mutationFn: () =>
      api<IssuedKey>(`/merchants/${id}/api-key`, {
        method: 'POST',
        as: 'admin',
      }),
  });
}

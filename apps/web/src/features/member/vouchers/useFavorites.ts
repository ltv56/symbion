import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Favorite {
  voucherId: number;
  createdAt: string;
}

const KEY = ['favorites'];

// Voucher ids, loaded while a detail is open
export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => api<Favorite[]>('/me/favorites'),
    select: (rows) => new Set(rows.map((row) => row.voucherId)),
    enabled,
  });
}

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationKey: KEY,
    // Same scope runs one after another
    scope: { id: 'favorites' },
    mutationFn: ({ voucherId, on }: { voucherId: number; on: boolean }) =>
      api<void>(`/me/favorites/${voucherId}`, {
        method: on ? 'PUT' : 'DELETE',
      }),
    onMutate: async ({ voucherId, on }) => {
      await client.cancelQueries({ queryKey: KEY });
      const previous = client.getQueryData<Favorite[]>(KEY);
      const others = (previous ?? []).filter(
        (row) => row.voucherId !== voucherId,
      );
      client.setQueryData<Favorite[]>(
        KEY,
        on
          ? [{ voucherId, createdAt: new Date().toISOString() }, ...others]
          : others,
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous === undefined) {
        void client.resetQueries({ queryKey: KEY });
      } else {
        client.setQueryData(KEY, context.previous);
      }
    },
    // Reload after the last toggle
    onSettled: () => {
      if (client.isMutating({ mutationKey: KEY }) === 1) {
        void client.invalidateQueries({ queryKey: KEY });
      }
    },
  });
}

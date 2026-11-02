import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { HistoryEntry } from '@/features/member/history/useHistory';

export interface AdminMember {
  id: number;
  merchantId: number;
  merchantName: string;
  email: string;
  name: string | null;
  tier: { id: number; name: string };
  balance: number;
  createdAt: string;
}

export interface AdminLot {
  id: number;
  merchantId: number;
  merchantName: string;
  remaining: number;
  expiresAt: string | null;
}

export interface AdminRedemption {
  id: number;
  code: string;
  status: 'issued' | 'used' | 'expired';
  points: number;
  voucherTitle: string;
  merchantId: number;
  merchantName: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface AdminMemberDetail extends AdminMember {
  spend12m: number;
  nextTier: { id: number; name: string; minSpend: number } | null;
  lots: AdminLot[];
  history: HistoryEntry[];
  redemptions: AdminRedemption[];
}

interface MemberPage {
  items: AdminMember[];
  nextCursor: number | null;
}

export interface MemberFilters {
  merchantId: string;
  tierId: string;
  q: string;
}

const PAGE_SIZE = 50;

// Newest first, one page at a time
export function useAdminMembers({ merchantId, tierId, q }: MemberFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'members', 'list', merchantId, tierId, q],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (pageParam !== null) query.set('after', String(pageParam));
      if (merchantId) query.set('merchantId', merchantId);
      if (tierId) query.set('tierId', tierId);
      if (q) query.set('q', q);
      return api<MemberPage>(`/admin/members?${query}`, { as: 'admin' });
    },
    getNextPageParam: (last) => last.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

export function useAdminMember(id: number) {
  return useQuery({
    queryKey: ['admin', 'members', 'detail', id],
    queryFn: () =>
      api<AdminMemberDetail>(`/admin/members/${id}`, { as: 'admin' }),
  });
}

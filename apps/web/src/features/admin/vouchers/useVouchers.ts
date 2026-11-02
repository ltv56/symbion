import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type VoucherStatus = 'active' | 'expired';

export interface AdminVoucher {
  id: number;
  merchantId: number;
  merchantName: string;
  title: string;
  description: string | null;
  steps: string[] | null;
  faceValue: number;
  pointsPrice: number;
  stock: number;
  validUntil: string;
  status: VoucherStatus;
  createdAt: string;
  redeemedCount: number;
}

interface VoucherPage {
  items: AdminVoucher[];
  nextCursor: number | null;
}

export interface VoucherFilters {
  merchantId: string;
  status: '' | VoucherStatus;
}

const PAGE_SIZE = 50;

// Every state, newest first, one page at a time
export function useAdminVouchers({ merchantId, status }: VoucherFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'vouchers', merchantId, status],
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (pageParam !== null) query.set('after', String(pageParam));
      if (merchantId) query.set('merchantId', merchantId);
      if (status) query.set('status', status);
      return api<VoucherPage>(`/admin/vouchers?${query}`, { as: 'admin' });
    },
    getNextPageParam: (last) => last.nextCursor,
    select: (data) => data.pages.flatMap((page) => page.items),
  });
}

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export type RedemptionStatus = 'issued' | 'used' | 'expired';

export interface MemberRedemption {
  id: number;
  code: string;
  status: RedemptionStatus;
  points: number;
  voucherTitle: string;
  merchantId: number;
  merchantName: string;
  usedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

export function useRedemptions() {
  return useQuery({
    queryKey: ['me', 'redemptions'],
    queryFn: () => api<MemberRedemption[]>('/me/redemptions'),
  });
}

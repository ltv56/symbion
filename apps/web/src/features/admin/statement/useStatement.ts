import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// netVnd > 0: the merchant owes the app. netVnd < 0: the app owes the merchant.
export interface MerchantStatement {
  merchantId: number;
  merchantName: string;
  earnedPoints: number;
  earnedVnd: number;
  refundedPoints: number;
  refundedVnd: number;
  redeemedPoints: number;
  redeemedVnd: number;
  breakagePoints: number;
  breakageVnd: number;
  netVnd: number;
}

export interface Statement {
  month: string;
  pointValueVnd: number;
  merchants: MerchantStatement[];
}

export function useStatement(month: string) {
  return useQuery({
    queryKey: ['admin', 'statement', month],
    queryFn: () =>
      api<Statement>(`/reconciliation?month=${month}`, { as: 'admin' }),
  });
}

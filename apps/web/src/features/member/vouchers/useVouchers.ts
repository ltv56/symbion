import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Voucher {
  id: number;
  merchantId: number;
  merchantName: string;
  title: string;
  faceValue: number;
  pointsPrice: number;
  stock: number;
  validUntil: string;
}

interface VoucherPage {
  items: Voucher[];
  nextCursor: number | null;
}

const PAGE_SIZE = 100;

// Every voucher
async function fetchAll(): Promise<Voucher[]> {
  const vouchers: Voucher[] = [];
  let after: number | null = null;
  do {
    const cursor: string = after === null ? '' : `&after=${after}`;
    const page: VoucherPage = await api<VoucherPage>(
      `/vouchers?limit=${PAGE_SIZE}${cursor}`,
    );
    vouchers.push(...page.items);
    after = page.nextCursor;
  } while (after !== null);
  return vouchers;
}

export function useVouchers() {
  return useQuery({ queryKey: ['vouchers'], queryFn: fetchAll });
}

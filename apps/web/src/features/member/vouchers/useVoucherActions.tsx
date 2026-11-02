import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RedeemDialog } from '@/features/member/redeem/RedeemDialog';
import type { Voucher } from './useVouchers';
import { VoucherDetailDialog } from './VoucherDetail';

// Return focus to the opener
export function useReturnFocus() {
  const from = useRef<Element | null>(null);
  return {
    remember: () => {
      from.current = document.activeElement;
    },
    restore: () => {
      const element = from.current;
      if (element instanceof HTMLElement && element.isConnected) {
        element.focus();
      }
    },
  };
}

// The detail and redeem dialogs a voucher ticket opens
export function useVoucherActions(
  vouchers: Voucher[],
  balance: number,
): {
  openDetail: (voucher: Voucher) => void;
  openRedeem: (voucher: Voucher) => void;
  dialogs: ReactNode;
} {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [redeem, setRedeem] = useState<Voucher | null>(null);
  const focus = useReturnFocus();
  const detail = vouchers.find((voucher) => voucher.id === detailId) ?? null;
  return {
    openDetail: (voucher) => {
      focus.remember();
      setDetailId(voucher.id);
    },
    openRedeem: setRedeem,
    dialogs: (
      <>
        <VoucherDetailDialog
          voucher={detail}
          balance={balance}
          onClose={() => setDetailId(null)}
          onCloseFocus={focus.restore}
          onRedeem={setRedeem}
        />
        <RedeemDialog
          voucher={redeem}
          balance={balance}
          onClose={() => setRedeem(null)}
        />
      </>
    ),
  };
}

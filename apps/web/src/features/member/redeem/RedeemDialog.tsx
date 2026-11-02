import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DialogShell } from '@/components/DialogShell';
import type { Voucher } from '@/features/member/vouchers/useVouchers';
import { RedeemPanel } from './RedeemPanel';
import { useRedeem } from './useRedeem';

// Focus fallback
export const FALLBACK_FOCUS_ID = 'vouchers-heading';

// Open while a voucher is set
export function RedeemDialog({
  voucher,
  balance,
  onClose,
}: {
  voucher: Voucher | null;
  balance: number;
  onClose: () => void;
}) {
  const { view, redeem, reset } = useRedeem();
  const [last, setLast] = useState(voucher);
  if (voucher && voucher !== last) setLast(voucher);
  const shown = voucher ?? last;
  const voucherId = voucher?.id;
  const trigger = useRef<Element | null>(null);

  // Remember the opener
  useLayoutEffect(() => {
    if (voucherId !== undefined) trigger.current = document.activeElement;
  }, [voucherId]);

  useEffect(() => {
    if (voucherId !== undefined) reset();
  }, [voucherId, reset]);

  return (
    <DialogShell
      open={voucher !== null}
      locked={view.kind === 'sending'}
      onClose={onClose}
      onCloseFocus={() => {
        const back = trigger.current;
        const target =
          back instanceof HTMLElement && back.isConnected
            ? back
            : document.getElementById(FALLBACK_FOCUS_ID);
        target?.focus();
      }}
    >
      {shown && (
        <RedeemPanel
          voucher={shown}
          balance={balance}
          view={view}
          onConfirm={() => void redeem(shown, balance)}
          onClose={onClose}
        />
      )}
    </DialogShell>
  );
}

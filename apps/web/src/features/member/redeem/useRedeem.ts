import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';
import type { Voucher } from '@/features/member/vouchers/useVouchers';
import { postRedemption } from './redeemApi';
import { viewAfterConflict } from './redeemView';
import type { RedeemView } from './redeemView';

// Definitive refusals
const DEFINITIVE = new Set([400, 404, 409, 422]);

const CONFIRM: RedeemView = { kind: 'confirm' };

export function useRedeem() {
  const client = useQueryClient();
  // One key per voucher until answered
  const keys = useRef(new Map<number, string>());
  const [view, setView] = useState<RedeemView>(CONFIRM);

  const reset = useCallback(() => setView(CONFIRM), []);

  const redeem = useCallback(
    async (voucher: Voucher, balance: number) => {
      const key = keys.current.get(voucher.id) ?? crypto.randomUUID();
      keys.current.set(voucher.id, key);
      setView({ kind: 'sending' });
      try {
        const { status, data } = await postRedemption(voucher.id, key);
        keys.current.delete(voucher.id);
        void client.invalidateQueries({ queryKey: ['me'] });
        void client.invalidateQueries({ queryKey: ['vouchers'] });
        setView(
          status === 200
            ? { kind: 'recorded', code: data.code, expiresAt: data.expiresAt }
            : {
                kind: 'created',
                code: data.code,
                expiresAt: data.expiresAt,
                balanceAfter: balance - data.points,
              },
        );
      } catch (error) {
        if (error instanceof ApiError && DEFINITIVE.has(error.status)) {
          keys.current.delete(voucher.id);
          setView(
            error.status === 409
              ? await viewAfterConflict(client, voucher)
              : error.status === 404
                ? { kind: 'gone' }
                : { kind: 'failed' },
          );
        } else {
          setView({ kind: 'failed' });
        }
      }
    },
    [client],
  );

  return { view, redeem, reset };
}

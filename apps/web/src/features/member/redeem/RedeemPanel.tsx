import { cn } from 'cn';
import { CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { RubberStamp } from '@/components/RubberStamp';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { Voucher } from '@/features/member/vouchers/useVouchers';
import {
  formatDate,
  formatDateTime,
  formatPoints,
  formatVnd,
} from '@/lib/format';
import { CodeCopy } from './CodeCopy';
import { codeExpiresAt } from './redeemView';
import type { RedeemView } from './redeemView';

function Summary({ voucher }: { voucher: Voucher }) {
  return (
    <div className="flex items-start gap-3">
      <MerchantAvatar id={voucher.merchantId} name={voucher.merchantName} />
      <div className="min-w-0 flex-1">
        <p
          title={voucher.title}
          className="line-clamp-3 font-medium wrap-anywhere"
        >
          {voucher.title}
        </p>
        <p
          title={voucher.merchantName}
          className="line-clamp-2 text-muted-foreground wrap-anywhere"
        >
          {voucher.merchantName}
        </p>
      </div>
    </div>
  );
}

function Figure({
  label,
  strong = false,
  children,
}: {
  label: string;
  strong?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'ml-auto max-w-full text-right font-mono tabular-nums wrap-anywhere',
          strong && 'font-semibold text-destructive',
        )}
      >
        {children}
      </dd>
    </div>
  );
}

function CodeBlock({ code, stamp }: { code: string; stamp: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-y py-3">
      <div className="[&>div]:mt-0">
        <CodeCopy code={code} />
      </div>
      <RubberStamp size="sm" rotate={-6} className="ml-auto">
        {stamp}
      </RubberStamp>
    </div>
  );
}

const ERROR_KINDS = new Set(['short', 'soldOut', 'gone', 'failed']);

export function RedeemPanel({
  voucher,
  balance,
  view,
  onConfirm,
  onClose,
}: {
  voucher: Voucher;
  balance: number;
  view: RedeemView;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [now] = useState(Date.now);
  const points = (value: number) => formatPoints(value, i18n.language);
  const unit = t('vouchers.unit', { count: voucher.pointsPrice });
  const sending = view.kind === 'sending';
  const asking = view.kind === 'confirm' || sending;
  const isError = ERROR_KINDS.has(view.kind);

  // Focus the primary action after the answer
  const primary = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(asking);
  useEffect(() => {
    if (wasAsking.current && !asking) primary.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  const heading = (() => {
    switch (view.kind) {
      case 'created':
        return {
          title: t('redeem.createdTitle'),
          text: t('redeem.createdHint', {
            date: formatDateTime(view.expiresAt, i18n.language),
          }),
        };
      case 'recorded':
        return {
          title: t('redeem.recordedTitle'),
          text: t('redeem.recordedHint', {
            date: formatDateTime(view.expiresAt, i18n.language),
          }),
        };
      case 'short':
        return {
          title: t('redeem.shortTitle'),
          text: t('redeem.short', {
            balance: points(view.balance),
            price: points(voucher.pointsPrice),
          }),
        };
      case 'soldOut':
        return { title: t('redeem.soldOutTitle'), text: t('redeem.soldOut') };
      case 'gone':
        return { title: t('redeem.goneTitle'), text: t('redeem.gone') };
      case 'failed':
        return { title: t('redeem.failedTitle'), text: t('redeem.failed') };
      default:
        return { title: t('redeem.title'), text: t('redeem.description') };
    }
  })();

  return (
    <>
      <header className="grid gap-1.5" aria-live="polite">
        <DialogTitle
          className={cn(
            'flex items-start gap-2 text-lg leading-snug font-semibold',
            isError && 'text-destructive',
          )}
        >
          {isError && <CircleAlert className="mt-1 size-4.5 shrink-0" />}
          <span>{heading.title}</span>
        </DialogTitle>
        <DialogDescription>{heading.text}</DialogDescription>
      </header>

      <Summary voucher={voucher} />

      {asking && (
        <>
          <dl className="divide-y border-y">
            <Figure label={t('redeem.faceValue')}>
              {formatVnd(voucher.faceValue, i18n.language)}
            </Figure>
            <Figure label={t('redeem.deduct')} strong>
              −{points(voucher.pointsPrice)} {unit}
            </Figure>
            <Figure label={t('redeem.balanceAfter')}>
              {points(balance - voucher.pointsPrice)} {unit}
            </Figure>
            <Figure label={t('redeem.codeUntil')}>
              {formatDate(codeExpiresAt(voucher, now), i18n.language)}
            </Figure>
          </dl>
          <p className="-mt-1 text-muted-foreground">{t('redeem.noRefund')}</p>
        </>
      )}

      {view.kind === 'created' && (
        <>
          <CodeBlock code={view.code} stamp={t('redeem.createdStamp')} />
          <dl className="divide-y border-b">
            <Figure label={t('redeem.deducted')} strong>
              −{points(voucher.pointsPrice)} {unit}
            </Figure>
            <Figure label={t('redeem.balanceNow')}>
              {points(view.balanceAfter)} {unit}
            </Figure>
          </dl>
        </>
      )}

      {view.kind === 'recorded' && (
        <CodeBlock code={view.code} stamp={t('redeem.recordedStamp')} />
      )}

      <footer className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-2 rounded-b-lg border-t bg-muted p-4 sm:flex-row sm:justify-end">
        {asking ? (
          <>
            <Button
              variant="outline"
              size="lg"
              disabled={sending}
              onClick={onClose}
            >
              {t('redeem.cancel')}
            </Button>
            <Button
              size="lg"
              disabled={sending}
              aria-busy={sending}
              onClick={onConfirm}
            >
              {sending ? t('redeem.sending') : t('redeem.confirm')}
            </Button>
          </>
        ) : view.kind === 'failed' ? (
          <>
            <Button variant="outline" size="lg" onClick={onClose}>
              {t('redeem.close')}
            </Button>
            <Button size="lg" ref={primary} onClick={onConfirm}>
              {t('redeem.retry')}
            </Button>
          </>
        ) : (
          <Button size="lg" ref={primary} onClick={onClose}>
            {t('redeem.close')}
          </Button>
        )}
      </footer>
    </>
  );
}

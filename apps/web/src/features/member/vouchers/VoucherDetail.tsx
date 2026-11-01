import { cn } from 'cn';
import { ArrowLeft, ExternalLink, X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useEffect, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogPortal } from '@/components/ui/dialog';
import { formatDate, formatPoints, formatVnd } from '@/lib/format';
import { availability } from './availability';
import type { Voucher } from './useVouchers';

type DetailVariant = 'page' | 'panel';

function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      <div className="mt-1">{children}</div>
    </section>
  );
}

function Photo({ src, name }: { src: string | null; name: string }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <div className="-mx-4 aspect-video overflow-hidden bg-muted">
      {src && !failed ? (
        <img
          src={src}
          alt={t('voucherDetail.photoAlt', { name })}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
      ) : (
        <div
          aria-hidden
          className="grid size-full place-items-center text-5xl font-semibold text-muted-foreground"
        >
          {name.trim().charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

// Voucher detail
export function VoucherDetailView({
  voucher,
  balance,
  variant,
  onClose,
  onRedeem,
  Title = 'h2',
}: {
  voucher: Voucher;
  balance: number;
  variant: DetailVariant;
  onClose: () => void;
  onRedeem: (voucher: Voucher) => void;
  // DialogTitle in the dialog
  Title?: ElementType;
}) {
  const { t, i18n } = useTranslation();
  const points = (value: number) => formatPoints(value, i18n.language);
  const unit = (value: number) => t('vouchers.unit', { count: value });
  const { kind } = availability(voucher, balance);
  const { merchantAddress: address, description, steps } = voucher;

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 -mx-4 h-0">
        <Button
          variant="outline"
          size="icon"
          aria-label={
            variant === 'page' ? t('vouchers.back') : t('voucherDetail.close')
          }
          onClick={onClose}
          className={cn(
            'absolute top-3 size-11 rounded-full bg-background/90 hover:bg-background',
            variant === 'page' ? 'left-3' : 'right-3',
          )}
        >
          {variant === 'page' ? <ArrowLeft /> : <X />}
        </Button>
      </div>
      <Photo src={voucher.merchantPhotoUrl} name={voucher.merchantName} />

      <div className="flex-1 space-y-5 py-4">
        <header className="flex items-start gap-3">
          <MerchantAvatar id={voucher.merchantId} name={voucher.merchantName} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {voucher.merchantName}
            </p>
            <Title className="mt-0.5 text-xl leading-snug font-semibold wrap-anywhere">
              {voucher.title}
            </Title>
            <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="font-mono font-semibold tabular-nums wrap-anywhere">
                {points(voucher.pointsPrice)} {unit(voucher.pointsPrice)}
              </span>
              <span className="text-sm text-muted-foreground wrap-anywhere">
                {t('voucherDetail.value', {
                  value: formatVnd(voucher.faceValue, i18n.language),
                })}
              </span>
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t('voucherDetail.until', {
                date: formatDate(voucher.validUntil, i18n.language),
              })}
            </p>
          </div>
        </header>

        {address && (
          <Section title={t('voucherDetail.address')}>
            <p className="wrap-anywhere">{address}</p>
            <a
              href={mapsUrl(address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-1.5 font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-current"
            >
              {t('voucherDetail.map')}
              <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">{t('voucherDetail.newTab')}</span>
            </a>
          </Section>
        )}

        {description && (
          <Section title={t('voucherDetail.about')}>
            <p className="wrap-anywhere whitespace-pre-line">{description}</p>
          </Section>
        )}

        {steps && steps.length > 0 && (
          <Section title={t('voucherDetail.steps')}>
            <ol className="list-decimal space-y-1 pl-5 wrap-anywhere">
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </Section>
        )}
      </div>

      <footer className="sticky bottom-0 -mx-4 space-y-3 border-t bg-background px-4 py-3">
        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm text-muted-foreground">
            {t('voucherDetail.balance')}
          </span>
          <span className="ml-auto font-mono font-semibold tabular-nums wrap-anywhere">
            {points(balance)} {unit(balance)}
          </span>
        </p>
        {kind === 'ok' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => onRedeem(voucher)}
          >
            {t('voucherDetail.redeem')}
          </Button>
        )}
        {(kind === 'short' || kind === 'negative') && (
          <p className="wrap-anywhere">
            <Trans
              i18nKey="voucherDetail.lacking"
              values={{ missing: points(voucher.pointsPrice - balance) }}
              components={{ n: <strong className="font-semibold" /> }}
            />
          </p>
        )}
        {kind === 'soldOut' && <p>{t('voucherDetail.soldOut')}</p>}
      </footer>
    </div>
  );
}

const WIDE = '(min-width: 768px)';

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const update = () => setWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}

const LAYER =
  'fixed z-50 overflow-y-auto bg-background text-foreground outline-none motion-reduce:animate-none';
const PAGE = `${LAYER} inset-0 duration-150 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-4 data-closed:animate-out data-closed:fade-out-0`;
const PANEL = `${LAYER} inset-y-0 right-0 w-[28rem] max-w-full ring-1 ring-foreground/10 duration-200 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right`;

// Open while a voucher is set
export function VoucherDetailDialog({
  voucher,
  balance,
  onClose,
  onCloseFocus,
  onRedeem,
}: {
  voucher: Voucher | null;
  balance: number;
  onClose: () => void;
  // Focus target on close
  onCloseFocus: () => void;
  onRedeem: (voucher: Voucher) => void;
}) {
  // Last voucher stays through the exit animation
  const [shown, setShown] = useState(voucher);
  if (voucher !== null && voucher !== shown) setShown(voucher);
  const wide = useWide();

  return (
    <Dialog open={voucher !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogPortal>
        {wide && (
          <DialogPrimitive.Overlay
            data-slot="dialog-overlay"
            className="fixed inset-0 z-50 bg-black/50 duration-200 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none"
          />
        )}
        <DialogPrimitive.Content
          data-slot="voucher-page"
          data-surface="ground"
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onCloseFocus();
          }}
          className={wide ? PANEL : PAGE}
        >
          <div className="mx-auto flex min-h-full max-w-xl flex-col px-4">
            {shown && (
              <VoucherDetailView
                voucher={shown}
                balance={balance}
                variant={wide ? 'panel' : 'page'}
                onClose={onClose}
                onRedeem={onRedeem}
                Title={DialogPrimitive.Title}
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

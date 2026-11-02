import { Ban, Pencil } from 'lucide-react';
import { useRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { RubberStamp } from '@/components/RubberStamp';
import { Button } from '@/components/ui/button';
import {
  formatDate,
  formatDateTime,
  formatPoints,
  formatVnd,
} from '@/lib/format';
import { Fact } from '../Fact';
import { useSettings } from '../programme/useProgramme';
import { OUTLINE } from '../styles';
import { useDialog } from '../useDialog';
import { EditVoucherDialog } from './EditVoucherDialog';
import { RetireDialog } from './RetireDialog';
import type { AdminVoucher } from './useVouchers';
import { voucherState } from './voucherState';

// One voucher on the ground: terms, stock and what it costs the app
export function VoucherDetail({
  voucher,
  now,
  ref,
}: {
  voucher: AdminVoucher;
  now: number;
  ref?: Ref<HTMLElement>;
}) {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const state = voucherState(voucher, now);
  const locale = i18n.language;
  const edit = useDialog();
  const retire = useDialog();
  const editButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  return (
    <section
      ref={ref}
      data-surface="ground"
      aria-labelledby="voucher-heading"
      className="scroll-mt-4 lg:sticky lg:top-4"
    >
      <div className="flex items-start gap-3">
        <MerchantAvatar id={voucher.merchantId} name={voucher.merchantName} />
        <div className="min-w-0 flex-1">
          <h2
            ref={heading}
            id="voucher-heading"
            tabIndex={-1}
            className="text-xl font-semibold outline-none wrap-anywhere"
          >
            {voucher.title}
          </h2>
          <p className="text-sm text-muted-foreground wrap-anywhere">
            {voucher.merchantName}
          </p>
        </div>
        {state !== 'live' && (
          <RubberStamp size="sm" rotate={-6} aria-hidden="true">
            {t(`admin.vouchers.state.${state}`)}
          </RubberStamp>
        )}
      </div>
      <dl className="mt-4 divide-y border-y text-sm">
        <Fact label={t('admin.vouchers.detail.state')}>
          {t(`admin.vouchers.state.${state}`)}
        </Fact>
        <Fact label={t('admin.vouchers.detail.faceValue')} mono>
          {formatVnd(voucher.faceValue, locale)}
        </Fact>
        <Fact label={t('admin.vouchers.detail.pointsPrice')} mono>
          {t('admin.vouchers.row.price', {
            points: formatPoints(voucher.pointsPrice, locale),
          })}
        </Fact>
        {settings.data && (
          <Fact label={t('admin.vouchers.detail.payout')} mono>
            {formatVnd(
              voucher.pointsPrice * settings.data.pointValueVnd,
              locale,
            )}
          </Fact>
        )}
        <Fact label={t('admin.vouchers.detail.stock')} mono>
          {formatPoints(voucher.stock, locale)}
        </Fact>
        <Fact label={t('admin.vouchers.detail.redeemed')} mono>
          {formatPoints(voucher.redeemedCount, locale)}
        </Fact>
        <Fact label={t('admin.vouchers.detail.validUntil')}>
          {formatDateTime(voucher.validUntil, locale)}
        </Fact>
        <Fact label={t('admin.vouchers.detail.created')}>
          {formatDate(voucher.createdAt, locale)}
        </Fact>
      </dl>
      {settings.data && (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('admin.vouchers.detail.payoutNote')}
        </p>
      )}
      {state !== 'retired' && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            ref={editButton}
            variant="outline"
            className={OUTLINE}
            onClick={edit.show}
          >
            <Pencil />
            {t('admin.vouchers.detail.edit')}
          </Button>
          <Button variant="outline" className={OUTLINE} onClick={retire.show}>
            <Ban />
            {t('admin.vouchers.detail.retire')}
          </Button>
        </div>
      )}
      {voucher.description && (
        <section className="mt-6" aria-labelledby="voucher-detail-description">
          <h3 id="voucher-detail-description" className="font-semibold">
            {t('admin.vouchers.detail.description')}
          </h3>
          <p className="mt-1 text-sm whitespace-pre-line wrap-anywhere">
            {voucher.description}
          </p>
        </section>
      )}
      {voucher.steps && voucher.steps.length > 0 && (
        <section className="mt-6" aria-labelledby="voucher-detail-steps">
          <h3 id="voucher-detail-steps" className="font-semibold">
            {t('admin.vouchers.detail.steps')}
          </h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
            {voucher.steps.map((step, index) => (
              <li key={index} className="wrap-anywhere">
                {step}
              </li>
            ))}
          </ol>
        </section>
      )}
      <EditVoucherDialog
        key={`edit-${voucher.id}-${edit.session}`}
        voucher={voucher}
        open={edit.open}
        onClose={edit.close}
        onCloseFocus={() => editButton.current?.focus()}
      />
      <RetireDialog
        key={`retire-${voucher.id}-${retire.session}`}
        voucher={voucher}
        open={retire.open}
        onClose={retire.close}
        onCloseFocus={() => heading.current?.focus()}
      />
    </section>
  );
}

import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { formatPoints, formatVnd, signed } from '@/lib/format';
import type { MerchantStatement } from './useStatement';

const CELL =
  'py-2.5 text-right align-top font-mono tabular-nums max-sm:text-xs';

// One merchant's lines for the month, on the ground
export function StatementDetail({
  row,
  ref,
}: {
  row: MerchantStatement;
  ref?: Ref<HTMLElement>;
}) {
  const { t, i18n } = useTranslation();
  const points = (n: number) =>
    signed(n, (v) => formatPoints(v, i18n.language));
  const vnd = (n: number) => signed(n, (v) => formatVnd(v, i18n.language));
  const sentence =
    row.netVnd > 0
      ? t('admin.statement.detail.merchantPays', {
          amount: formatVnd(row.netVnd, i18n.language),
        })
      : row.netVnd < 0
        ? t('admin.statement.detail.appPays', {
            amount: formatVnd(-row.netVnd, i18n.language),
          })
        : t('admin.statement.detail.even');

  return (
    <section
      ref={ref}
      data-surface="ground"
      aria-labelledby="statement-merchant"
      className="scroll-mt-4 lg:sticky lg:top-4"
    >
      <div className="flex items-center gap-3">
        <MerchantAvatar id={row.merchantId} name={row.merchantName} />
        <h2
          id="statement-merchant"
          className="min-w-0 text-xl font-semibold wrap-anywhere"
        >
          {row.merchantName}
        </h2>
      </div>
      <p className="mt-4 text-lg font-semibold wrap-anywhere">{sentence}</p>
      <table className="mt-4 w-full border-collapse text-sm">
        <caption className="sr-only">
          {t('admin.statement.detail.lines')}
        </caption>
        <thead>
          <tr className="border-b border-border text-muted-foreground">
            <th scope="col" className="py-2 text-left font-normal">
              <span className="sr-only">
                {t('admin.statement.detail.line')}
              </span>
            </th>
            <th scope="col" className="py-2 text-right font-normal">
              {t('admin.statement.detail.points')}
            </th>
            <th
              scope="col"
              className="py-2 pl-2 sm:pl-3 text-right font-normal"
            >
              {t('admin.statement.detail.vnd')}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border">
            <th
              scope="row"
              className="py-2.5 pr-2 sm:pr-3 text-left font-normal"
            >
              {t('admin.statement.detail.issued')}
            </th>
            <td className={CELL}>{points(row.earnedPoints)}</td>
            <td className={`${CELL} pl-2 sm:pl-3`}>{vnd(row.earnedVnd)}</td>
          </tr>
          <tr className="border-b border-border">
            <th
              scope="row"
              className="py-2.5 pr-2 sm:pr-3 text-left font-normal"
            >
              {t('admin.statement.detail.refunded')}
            </th>
            <td className={CELL}>{points(-row.refundedPoints)}</td>
            <td className={`${CELL} pl-2 sm:pl-3`}>{vnd(-row.refundedVnd)}</td>
          </tr>
          <tr className="border-b border-border">
            <th
              scope="row"
              className="py-2.5 pr-2 sm:pr-3 text-left font-normal"
            >
              {t('admin.statement.detail.redeemed')}
            </th>
            <td className={CELL}>{points(-row.redeemedPoints)}</td>
            <td className={`${CELL} pl-2 sm:pl-3`}>{vnd(-row.redeemedVnd)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <th scope="row" className="py-2.5 pr-2 sm:pr-3 text-left">
              {t('admin.statement.detail.net')}
            </th>
            <td className={CELL} />
            <td className={`${CELL} pl-2 sm:pl-3`}>{vnd(row.netVnd)}</td>
          </tr>
        </tfoot>
      </table>
      {row.breakagePoints > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t('admin.statement.detail.breakage', {
            count: row.breakagePoints,
            points: formatPoints(row.breakagePoints, i18n.language),
            amount: formatVnd(row.breakageVnd, i18n.language),
          })}
        </p>
      )}
    </section>
  );
}

import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { formatVnd, signed } from '@/lib/format';
import { RecordRow } from '../RecordRow';
import type { MerchantStatement } from './useStatement';

// What the merchant owes the app (issued minus refunded) and what the app owes the merchant (redeemed)
export function sides(row: MerchantStatement) {
  return {
    merchantSide: Math.max(0, row.earnedVnd - row.refundedVnd),
    appSide: row.redeemedVnd,
  };
}

// Two halves meeting at the split: solid to the left, outline to the right
function Stick({
  merchantSide,
  appSide,
  scale,
}: {
  merchantSide: number;
  appSide: number;
  scale: number;
}) {
  const half = (value: number) => (scale > 0 ? (value / scale) * 50 : 0);
  return (
    <div aria-hidden className="relative mt-3 h-2">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <span className="absolute -inset-y-1 left-1/2 w-px bg-card-foreground" />
      <span
        className="absolute inset-y-0 right-1/2 rounded-l-full bg-card-foreground"
        style={{
          width: `${half(merchantSide)}%`,
          minWidth: merchantSide > 0 ? 2 : 0,
        }}
      />
      <span
        className="absolute inset-y-0 left-1/2 rounded-r-full border border-l-0 border-card-foreground"
        style={{
          width: `${half(appSide)}%`,
          minWidth: appSide > 0 ? 2 : 0,
        }}
      />
    </div>
  );
}

export function StickRow({
  row,
  scale,
  selected,
  onSelect,
}: {
  row: MerchantStatement;
  scale: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { merchantSide, appSide } = sides(row);
  const word =
    row.netVnd > 0 ? 'merchantPays' : row.netVnd < 0 ? 'appPays' : 'even';

  return (
    <RecordRow selected={selected} onSelect={onSelect}>
      <span className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <span className="flex min-w-0 flex-1 basis-40 items-center gap-3">
          <MerchantAvatar id={row.merchantId} name={row.merchantName} />
          <span
            className="line-clamp-2 font-medium wrap-anywhere"
            title={row.merchantName}
          >
            {row.merchantName}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-mono text-base font-medium tabular-nums">
            {signed(row.netVnd, (n) => formatVnd(n, i18n.language))}
          </span>
          <span className="block text-[13px] text-muted-foreground">
            {t(`admin.statement.${word}`)}
          </span>
        </span>
      </span>
      <Stick merchantSide={merchantSide} appSide={appSide} scale={scale} />
    </RecordRow>
  );
}

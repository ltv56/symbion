import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { formatDate, formatPoints } from '@/lib/format';
import { formatSigned } from './formatSigned';
import type { HistoryEntry } from './useHistory';

// The most specific label first, then the plain type
export function kindKeys(entry: HistoryEntry): string[] {
  return [
    `history.kind.${entry.type}_${entry.ref?.type ?? 'none'}`,
    `history.kind.${entry.type}`,
  ];
}

export function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const { t, i18n } = useTranslation();
  const earned = entry.points > 0;
  const amount = formatPoints(Math.abs(entry.points), i18n.language);

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p
          title={entry.merchantName}
          className="line-clamp-2 font-medium wrap-anywhere"
        >
          {entry.merchantName}
        </p>
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
          <span className="wrap-anywhere">{t(kindKeys(entry))}</span>
          <span className="whitespace-nowrap">
            {formatDate(entry.createdAt, i18n.language)}
          </span>
        </p>
      </div>
      <span className="sr-only">
        {t(earned ? 'history.earned' : 'history.spent', { n: amount })}
      </span>
      <span
        aria-hidden
        className="flex max-w-[40%] shrink-0 flex-col items-end leading-tight"
      >
        <span
          className={cn(
            'font-mono tabular-nums wrap-anywhere',
            amount.length > 8 ? 'text-sm' : 'text-base',
            earned ? 'font-medium text-earn' : 'font-semibold',
          )}
        >
          {formatSigned(entry.points, i18n.language)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('vouchers.unit', { count: Math.abs(entry.points) })}
        </span>
      </span>
    </li>
  );
}

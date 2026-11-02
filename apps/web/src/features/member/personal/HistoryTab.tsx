import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from 'cn';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { sameDay } from '@/features/member/expiry/expiry';
import type { useActiveMark } from '@/features/member/expiry/useActiveMark';
import { formatSigned } from '@/features/member/history/formatSigned';
import type { HistoryEntry } from '@/features/member/history/useHistory';
import type { useHistoryYear } from './useHistoryYear';
import { formatDate, formatPoints } from '@/lib/format';
import { markKey } from './marks';
import { PagedRows } from './PagedRows';

type Link = ReturnType<typeof useActiveMark>;

// The most specific label first, then the plain type
function kindKeys(entry: HistoryEntry): string[] {
  return [
    `history.kind.${entry.type}_${entry.ref?.type ?? 'none'}`,
    `history.kind.${entry.type}`,
  ];
}

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const { t, i18n } = useTranslation();
  const earned = entry.points > 0;
  const amount = formatPoints(Math.abs(entry.points), i18n.language);
  return (
    <div className="flex items-center gap-3 py-3">
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
    </div>
  );
}

// The chosen day, its count, and the way out
function DayBar({
  day,
  count,
  onClear,
}: {
  day: Date;
  count: number;
  onClear: () => void;
}) {
  const { t, i18n } = useTranslation();
  const date = formatDate(day, i18n.language);
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border">
      <p className="min-w-0 py-2 text-sm font-medium wrap-anywhere">
        {t('personal.dayFilter', { date })}
        <span className="text-muted-foreground">
          {' · '}
          {t('personal.dayCount', { count })}
        </span>
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="-mr-2 hover:bg-card-foreground/10"
        onClick={onClear}
      >
        <X aria-hidden />
        <span className="sr-only">{t('personal.clearDay')}</span>
      </Button>
    </div>
  );
}

// Entries linked to the calendar; a pressed day keeps only its entries
export function HistoryTab({
  query,
  link,
  day,
  onClearDay,
}: {
  query: ReturnType<typeof useHistoryYear>;
  link: Link;
  day: Date | null;
  onClearDay: () => void;
}) {
  const { t } = useTranslation();
  const all = query.data?.entries ?? [];
  const entries = day
    ? all.filter((entry) => sameDay(new Date(entry.createdAt), day))
    : all;

  return (
    <section className="rounded-lg bg-card px-4 text-card-foreground">
      {query.isPending && (
        <div role="status" className="space-y-3 py-4">
          <span className="sr-only">{t('member.loading')}</span>
          <div className="h-10 animate-pulse rounded-lg bg-secondary" />
          <div className="h-10 animate-pulse rounded-lg bg-secondary" />
        </div>
      )}
      {query.isError && query.data === undefined && (
        <div className="space-y-3 py-4">
          <FormError>{t('errors.generic')}</FormError>
          <Button onClick={() => void query.refetch()}>
            {t('member.retry')}
          </Button>
        </div>
      )}
      {query.data !== undefined &&
        (all.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {t('history.empty')}
          </p>
        ) : (
          <div className="flex h-[clamp(22rem,70svh,40rem)] flex-col xl:h-[clamp(24rem,calc(100svh-13rem),48rem)]">
            {day ? (
              <DayBar day={day} count={entries.length} onClear={onClearDay} />
            ) : (
              <p className="border-b border-border py-2 text-sm text-muted-foreground">
                {t('personal.pickDay')}
              </p>
            )}
            <div className="min-h-0 flex-1">
              {entries.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  {t('personal.dayEmpty')}
                </p>
              ) : (
                <PagedRows
                  key={day?.toDateString() ?? 'all'}
                  items={entries}
                  label={t('history.title')}
                >
                  {(visible) => (
                    <ul>
                      {visible.map((entry, i) => {
                        const previous = visible[i - 1];
                        const props = link.row(
                          markKey('history', entry.id),
                          previous
                            ? markKey('history', previous.id)
                            : undefined,
                        );
                        return (
                          <li key={entry.id} {...props.item}>
                            <div {...props.press}>
                              <EntryRow entry={entry} />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </PagedRows>
              )}
            </div>
            {query.data?.truncated && !day && (
              <p className="border-t border-border py-2 text-sm text-muted-foreground">
                {t('history.limit', { count: all.length })}
              </p>
            )}
          </div>
        ))}
    </section>
  );
}

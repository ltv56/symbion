import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { ShowMore } from '@/components/ShowMore';
import { Button } from '@/components/ui/button';
import { HistoryRow } from './HistoryRow';
import { useHistory } from './useHistory';
import type { HistoryEntry } from './useHistory';

// Matches the api's limit
const HISTORY_LIMIT = 50;
// Entries shown before "show all"
const SHOWN = 10;

function Entries({ entries }: { entries: HistoryEntry[] }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? entries : entries.slice(0, SHOWN);

  return (
    <>
      <ul className="divide-y divide-border">
        {shown.map((entry) => (
          <HistoryRow key={entry.id} entry={entry} />
        ))}
      </ul>
      {entries.length > SHOWN && (
        <ShowMore
          expanded={expanded}
          onToggle={() => setExpanded((value) => !value)}
          moreLabel={t('history.showAll', { n: entries.length })}
          lessLabel={t('history.showLess')}
        />
      )}
      {entries.length >= HISTORY_LIMIT && (
        <p className="border-t border-border py-3 text-sm text-muted-foreground">
          {t('history.limit', { count: HISTORY_LIMIT })}
        </p>
      )}
    </>
  );
}

// A red panel closed by default; the header opens it
export function HistoryPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const history = useHistory(open);
  const bodyId = useId();

  return (
    <section className="rounded-lg bg-card text-card-foreground">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-base font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {t('history.title')}
          <ChevronDown
            aria-hidden
            className={cn(
              'size-4 shrink-0 transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
          />
        </button>
      </h2>
      {open && (
        <div id={bodyId} className="border-t border-border px-4">
          {history.isPending && (
            <div role="status" className="space-y-3 py-4">
              <span className="sr-only">{t('member.loading')}</span>
              <div className="h-10 animate-pulse rounded-lg bg-secondary" />
              <div className="h-10 animate-pulse rounded-lg bg-secondary" />
            </div>
          )}
          {history.isError && history.data === undefined && (
            <div className="space-y-3 py-4">
              <FormError>{t('errors.generic')}</FormError>
              <Button onClick={() => void history.refetch()}>
                {t('member.retry')}
              </Button>
            </div>
          )}
          {history.data !== undefined &&
            (history.data.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {t('history.empty')}
              </p>
            ) : (
              <Entries entries={history.data} />
            ))}
        </div>
      )}
    </section>
  );
}

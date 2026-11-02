import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { OUTLINE } from '../styles';
import type { TapeEntry } from './counterApi';

function Json({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="mt-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <pre
        tabIndex={0}
        aria-label={label}
        className="mt-0.5 max-h-60 overflow-auto rounded-md bg-secondary p-2 font-mono text-xs break-words whitespace-pre-wrap focus-visible:outline-2 focus-visible:outline-foreground"
      >
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

// Every call as a strip of paper: where it went, what came back
export function ReceiptTape({
  entries,
  onClear,
}: {
  entries: TapeEntry[];
  onClear: () => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <section
      data-surface="ground"
      aria-labelledby="tape-heading"
      className="border-t border-dashed border-foreground/40 pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tape-heading" className="text-lg font-semibold">
          {t('admin.counter.tape.title')}
        </h2>
        {entries.length > 0 && (
          <Button variant="outline" className={OUTLINE} onClick={onClear}>
            {t('admin.counter.tape.clear')}
          </Button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('admin.counter.tape.empty')}
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-dashed divide-foreground/40 border-y border-dashed border-foreground/40">
          {entries.map((entry) => {
            const failed = entry.status === 0 || entry.status >= 400;
            return (
              <li key={entry.id} className="py-3 text-sm">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span
                    className={
                      failed
                        ? 'rounded-md border border-destructive px-2 font-mono font-semibold text-destructive'
                        : 'rounded-md border border-foreground/50 px-2 font-mono font-semibold'
                    }
                  >
                    {entry.status === 0 ? '—' : entry.status}
                  </span>
                  <span className="font-mono wrap-anywhere">
                    POST {entry.path}
                  </span>
                  <span className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
                    {new Date(entry.at).toLocaleTimeString(i18n.language)} ·{' '}
                    {entry.ms} ms
                  </span>
                </p>
                <p className="mt-1 font-mono text-xs break-all text-muted-foreground">
                  x-api-key …{entry.keyTail}
                  {entry.idempotencyKey &&
                    ` · Idempotency-Key ${entry.idempotencyKey}`}
                </p>
                {entry.status === 200 && entry.idempotencyKey && (
                  <p className="mt-1 text-xs font-medium">
                    {t('admin.counter.tape.replayed')}
                  </p>
                )}
                {entry.request !== null && (
                  <Json
                    label={t('admin.counter.tape.request')}
                    value={entry.request}
                  />
                )}
                <Json
                  label={t('admin.counter.tape.response')}
                  value={entry.response}
                />
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

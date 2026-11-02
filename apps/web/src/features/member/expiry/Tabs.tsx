import { cn } from 'cn';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SandHourglass } from './calendar/SandHourglass';
import { VoucherMark } from './calendar/VoucherMark';
import type { MarkKind } from './marks';

const ORDER: MarkKind[] = ['points', 'code'];

export const tabId = (base: string, kind: MarkKind) => `${base}-tab-${kind}`;
export const panelId = (base: string) => `${base}-panel`;

// Points or vouchers
export function Tabs({
  base,
  value,
  onChange,
}: {
  base: string;
  value: MarkKind;
  onChange: (kind: MarkKind) => void;
}) {
  const { t } = useTranslation();
  const label = (kind: MarkKind) =>
    kind === 'points' ? t('timeline.tabPoints') : t('timeline.tabVouchers');
  const move = (event: KeyboardEvent, from: number) => {
    const last = ORDER.length - 1;
    const next =
      event.key === 'ArrowRight'
        ? (from + 1) % ORDER.length
        : event.key === 'ArrowLeft'
          ? (from + last) % ORDER.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    const kind = ORDER[next]!;
    onChange(kind);
    document.getElementById(tabId(base, kind))?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={t('timeline.tabsLabel')}
      className="flex border-b border-border"
    >
      {ORDER.map((kind, index) => {
        const selected = kind === value;
        return (
          <button
            key={kind}
            id={tabId(base, kind)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId(base)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(kind)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              'relative flex min-h-11 flex-1 items-center justify-center gap-2 rounded-t-lg px-4 text-base font-semibold transition-colors motion-reduce:transition-none',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground',
              selected
                ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground'
                : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
            )}
          >
            {kind === 'points' ? (
              <SandHourglass lit={false} className="size-4" />
            ) : (
              <VoucherMark lit={false} className="size-4" />
            )}
            {label(kind)}
          </button>
        );
      })}
    </div>
  );
}

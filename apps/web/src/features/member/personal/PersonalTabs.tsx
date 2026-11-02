import { cn } from 'cn';
import { History } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { SandHourglass } from '@/features/member/expiry/calendar/SandHourglass';
import { VoucherMark } from '@/features/member/expiry/calendar/VoucherMark';
import type { MarkKind } from './marks';

const ORDER: MarkKind[] = ['points', 'code', 'history'];

const LABEL: Record<MarkKind, string> = {
  points: 'personal.tabPoints',
  code: 'personal.tabCodes',
  history: 'personal.tabHistory',
};

export const tabId = (base: string, kind: MarkKind) => `${base}-tab-${kind}`;
export const panelId = (base: string) => `${base}-panel`;

function TabIcon({ kind }: { kind: MarkKind }) {
  if (kind === 'points') {
    return <SandHourglass lit={false} className="size-4 shrink-0" />;
  }
  if (kind === 'code') {
    return <VoucherMark lit={false} className="size-4 shrink-0" />;
  }
  return <History aria-hidden className="size-4 shrink-0" />;
}

// Points, my vouchers, history
export function PersonalTabs({
  base,
  value,
  onChange,
}: {
  base: string;
  value: MarkKind;
  onChange: (kind: MarkKind) => void;
}) {
  const { t } = useTranslation();
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
      data-surface="ground"
      role="tablist"
      aria-label={t('personal.tabsLabel')}
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
              'relative flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-t-lg px-1.5 text-sm font-semibold transition-colors sm:px-3 sm:text-base motion-reduce:transition-none',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground',
              selected
                ? 'text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground'
                : 'text-muted-foreground hover:bg-foreground/10 hover:text-foreground',
            )}
          >
            <span className="contents max-[24rem]:hidden">
              <TabIcon kind={kind} />
            </span>
            <span className="min-w-0 leading-tight text-balance">
              {t(LABEL[kind])}
            </span>
          </button>
        );
      })}
    </div>
  );
}

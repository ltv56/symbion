import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { monthLabel, sameMonth } from '../expiry';
import { MarkGlyph, useMarkSummary } from './MarkGlyph';
import { moreLabel, PRESS } from './layout';
import { byMark } from '../marks';
import type { Base } from './types';

export function MonthButton({
  date,
  now,
  base,
  enabled,
  onOpen,
  className,
}: {
  date: Date;
  now: Date;
  base: Base;
  enabled: boolean;
  onOpen: (focus?: string) => void;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const summary = useMarkSummary();
  const label = monthLabel(date, i18n.language);
  const here = enabled
    ? base.marks
        .filter((mark) => sameMonth(new Date(mark.expiresAt), date))
        .sort(
          (a, b) =>
            new Date(a.expiresAt).getDate() - new Date(b.expiresAt).getDate() ||
            byMark(a, b),
        )
    : [];
  // Wide: two markers, then a count. Narrow: one and the count
  const shown = here.slice(0, 2);
  const many = here.length > 2;
  const isToday = sameMonth(now, date);
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => onOpen()}
      aria-label={t('timeline.monthMarks', {
        month: `${label} ${date.getFullYear()}`,
        summary: summary(here),
      })}
      className={cn(
        // the box hugs its content
        '@container flex flex-col items-center self-start rounded-lg px-1 py-2 text-sm',
        PRESS,
        !enabled && 'opacity-35',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-8 place-items-center rounded-full tabular-nums',
          isToday && 'bg-foreground font-semibold text-background',
        )}
      >
        {label}
        {isToday && <span className="sr-only"> {t('timeline.today')}</span>}
      </span>
      {here.length > 0 && (
        <span
          className="mt-1.5 flex h-4.5 items-center justify-center gap-0.5"
          aria-hidden
        >
          {shown.map((mark, i) => (
            <span
              key={mark.key}
              className={cn(
                // small screens: the press falls through to the month
                'pointer-events-none grid size-4.5 place-items-center md:pointer-events-auto',
                i === 1 && many && '@max-[3.5rem]:hidden',
              )}
              onPointerEnter={() => base.onActiveChange(mark.key)}
              onPointerLeave={() => base.onActiveChange(null)}
              // opens the month with this mark's day blinking
              onClick={(event) => {
                event.stopPropagation();
                onOpen(mark.key);
              }}
            >
              <MarkGlyph
                mark={mark}
                lit={base.activeKey === mark.key}
                className="size-4.5"
              />
            </span>
          ))}
          {many && (
            <>
              <span className="font-mono text-xs @max-[3.5rem]:hidden">
                {moreLabel(here.length - 2)}
              </span>
              <span className="hidden font-mono text-xs @max-[3.5rem]:inline">
                {moreLabel(here.length - 1)}
              </span>
            </>
          )}
        </span>
      )}
    </button>
  );
}

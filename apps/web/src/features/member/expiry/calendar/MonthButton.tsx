import { cn } from 'cn';
import { useTranslation } from 'react-i18next';
import { monthLabel, sameMonth } from '../expiry';
import { SandHourglass } from './SandHourglass';
import { moreLabel } from './layout';
import type { Base } from './types';

export function MonthButton({
  date,
  now,
  base,
  className,
}: {
  date: Date;
  now: Date;
  base: Base;
  className?: string;
}) {
  const { t, i18n } = useTranslation();
  const label = monthLabel(date, i18n.language);
  const here = base.lots
    .flatMap((lot) => {
      if (!lot.expiresAt) return [];
      const expires = new Date(lot.expiresAt);
      return sameMonth(expires, date)
        ? [{ id: lot.id, day: expires.getDate() }]
        : [];
    })
    .sort((a, b) => a.day - b.day);
  // Wide: two hourglasses, then a count. Narrow: one and the count
  const shown = here.slice(0, 2);
  const many = here.length > 2;
  const isToday = sameMonth(now, date);
  return (
    <div
      role="group"
      aria-label={t('timeline.monthLots', {
        month: `${label} ${date.getFullYear()}`,
        count: here.length,
      })}
      className={cn(
        // the box hugs its content
        '@container flex flex-col items-center self-start rounded-lg px-1 py-2 text-sm',
        className,
      )}
    >
      <span
        className={cn(
          'grid size-8 place-items-center rounded-full tabular-nums',
          isToday && 'bg-card-foreground font-semibold text-card',
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
          {shown.map(({ id }, i) => (
            <span
              key={id}
              className={cn(
                'grid size-4.5 place-items-center',
                i === 1 && many && '@max-[3.5rem]:hidden',
              )}
              onPointerEnter={() => base.onActiveChange(id)}
              onPointerLeave={() => base.onActiveChange(null)}
            >
              <SandHourglass lit={base.activeId === id} className="size-4.5" />
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
    </div>
  );
}

import { cn } from 'cn';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DAY_MS,
  EXPIRING_SOON_DAYS,
  inHorizon,
  monthLabel,
  monthsAhead,
  sameDay,
} from '../expiry';
import { SandHourglass } from './SandHourglass';
import { moreLabel } from './layout';
import { NavBar } from './NavBar';
import type { Base, CalendarView, Open } from './types';

export function DaysView({
  view,
  base,
  now,
  open,
}: {
  view: Extract<CalendarView, { kind: 'days' }>;
  base: Base;
  now: Date;
  open: Open;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { year, month, from } = view;
  const first = new Date(year, month, 1);
  const total = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ahead = monthsAhead(year, month, now);
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(
      new Date(2024, 0, 1 + i),
    ),
  );
  const go = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    open({
      kind: 'days',
      year: next.getFullYear(),
      month: next.getMonth(),
      from,
    });
  };
  return (
    <div>
      <NavBar
        title={`${monthLabel(first, lang)} ${year}`}
        prevDisabled={!inHorizon(ahead - 1)}
        nextDisabled={!inHorizon(ahead + 1)}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        onBack={() =>
          open(from === 'year' ? { kind: 'year', year } : { kind: 'window' })
        }
      />
      <div
        className="grid grid-cols-7 text-center text-xs text-muted-foreground"
        aria-hidden
      >
        {weekdays.map((name) => (
          <span key={name} className="py-1">
            {name}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(60px,auto)]">
        {Array.from({ length: offset }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const date = new Date(year, month, i + 1);
          const diff = Math.round((date.getTime() - today.getTime()) / DAY_MS);
          const here = base.lots.filter(
            (lot) => lot.expiresAt && sameDay(new Date(lot.expiresAt), date),
          );
          const first = here[0];
          const picked = here.some((lot) => lot.id === base.selectedId);
          const pick = () => {
            if (first) base.onPick(first.id);
          };
          return (
            <div
              key={i}
              {...(first && {
                role: 'button',
                tabIndex: 0,
                'aria-pressed': picked,
                onClick: pick,
                onKeyDown: (event: KeyboardEvent) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    pick();
                  }
                },
              })}
              className={cn(
                // the box hugs its content
                '@container flex flex-col items-center self-start rounded-lg py-1.5 text-sm tabular-nums',
                diff < 0 && 'opacity-40',
                diff === EXPIRING_SOON_DAYS &&
                  'outline-2 -outline-offset-2 outline-dashed outline-destructive',
                first &&
                  'transition-colors hover:bg-card-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-card-foreground motion-reduce:transition-none',
                picked &&
                  'bg-card-foreground/10 inset-ring-1 inset-ring-card-foreground/25',
                view.focus !== undefined &&
                  here.some((lot) => lot.id === view.focus) &&
                  'day-flash',
              )}
            >
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full',
                  diff === 0 && 'bg-card-foreground font-semibold text-card',
                )}
              >
                {i + 1}
              </span>
              {here.length > 0 && (
                <span
                  className="mt-1 flex h-4 items-center justify-center"
                  aria-hidden
                >
                  {here.map((lot, i) => (
                    <span
                      key={lot.id}
                      className={cn(
                        'pointer-events-none grid size-4 cursor-pointer place-items-center md:pointer-events-auto',
                        // three or more lots show two and a count
                        here.length > 2 && i > 1 && 'hidden',
                        here.length > 2 && i === 1 && '@max-[3.5rem]:hidden',
                      )}
                      onPointerEnter={() => base.onActiveChange(lot.id)}
                      onPointerLeave={() => base.onActiveChange(null)}
                      onClick={(event) => {
                        event.stopPropagation();
                        base.onPick(lot.id);
                      }}
                    >
                      <SandHourglass
                        lit={base.activeId === lot.id}
                        className="size-4"
                      />
                    </span>
                  ))}
                  {here.length > 2 && (
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
              {here.length > 0 && (
                <span className="sr-only">
                  {t('timeline.lots', { count: here.length })}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

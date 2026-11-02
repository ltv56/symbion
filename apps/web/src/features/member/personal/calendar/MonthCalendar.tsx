import { cn } from 'cn';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { moreLabel, PRESS } from '@/features/member/expiry/calendar/layout';
import {
  DAY_MS,
  EXPIRING_SOON_DAYS,
  monthsAhead,
  sameDay,
  sameMonth,
} from '@/features/member/expiry/expiry';
import { byMark } from '../marks';
import type { Mark } from '../marks';
import { inRange } from '../range';
import { MarkGlyph, useMarkSummary } from './MarkGlyph';
import type { Base } from './types';

interface Shown {
  year: number;
  month: number;
}

const capitalize = (text: string) =>
  text.charAt(0).toLocaleUpperCase() + text.slice(1);

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid min-h-11 min-w-11 place-items-center rounded-lg disabled:opacity-35',
        PRESS,
      )}
    >
      {children}
    </button>
  );
}

// A trigger that shows the value and opens a list of choices
function Picker({
  label,
  value,
  choice,
  onChoice,
  children,
}: {
  label: string;
  value: string;
  choice: string;
  onChoice: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${value}`}
          className={cn(
            'flex min-h-11 items-center gap-1 rounded-lg px-3 text-base font-semibold aria-expanded:bg-foreground/10',
            PRESS,
          )}
        >
          {value}
          <ChevronDown aria-hidden className="size-4 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-44">
        <DropdownMenuRadioGroup value={choice} onValueChange={onChoice}>
          {children}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Month and year pickers between two arrows
function Header({
  shown,
  now,
  base,
  onShow,
  canPrev,
  canNext,
  onStep,
}: {
  shown: Shown;
  now: Date;
  base: Base;
  onShow: (next: Shown) => void;
  canPrev: boolean;
  canNext: boolean;
  onStep: (delta: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { range, marks } = base;
  const monthName = (month: number) =>
    capitalize(
      new Intl.DateTimeFormat(lang, { month: 'long' }).format(
        new Date(2024, month, 1),
      ),
    );
  const allowed = (year: number, month: number) =>
    inRange(monthsAhead(year, month, now), range);
  const yearAt = (delta: number) =>
    new Date(now.getFullYear(), now.getMonth() + delta, 1).getFullYear();
  const years = Array.from(
    { length: yearAt(range.to) - yearAt(range.from) + 1 },
    (_, i) => yearAt(range.from) + i,
  );
  const countIn = (year: number, month: number) =>
    marks.filter((mark) => sameMonth(new Date(mark.at), new Date(year, month)))
      .length;
  // A year whose current month is out of range lands on its nearest month
  const pickYear = (year: number) => {
    const months = Array.from({ length: 12 }, (_, m) => m).filter((m) =>
      allowed(year, m),
    );
    const month = months.includes(shown.month)
      ? shown.month
      : (months.reduce((best, m) =>
          Math.abs(m - shown.month) < Math.abs(best - shown.month) ? m : best,
        ) ?? shown.month);
    onShow({ year, month });
  };

  return (
    <div className="flex items-center justify-center">
      <IconButton
        label={t('timeline.prev')}
        disabled={!canPrev}
        onClick={() => onStep(-1)}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </IconButton>
      <Picker
        label={t('personal.calendarMonth')}
        value={monthName(shown.month)}
        choice={String(shown.month)}
        onChoice={(value) => onShow({ ...shown, month: Number(value) })}
      >
        {Array.from({ length: 12 }, (_, m) => {
          const count = countIn(shown.year, m);
          return (
            <DropdownMenuRadioItem
              key={m}
              value={String(m)}
              disabled={!allowed(shown.year, m)}
              className="whitespace-nowrap"
            >
              {count > 0
                ? t('personal.monthWithMarks', { name: monthName(m), count })
                : monthName(m)}
            </DropdownMenuRadioItem>
          );
        })}
      </Picker>
      <Picker
        label={t('personal.calendarYear')}
        value={String(shown.year)}
        choice={String(shown.year)}
        onChoice={(value) => pickYear(Number(value))}
      >
        {years.map((year) => (
          <DropdownMenuRadioItem key={year} value={String(year)}>
            {year}
          </DropdownMenuRadioItem>
        ))}
      </Picker>
      <IconButton
        label={t('timeline.next')}
        disabled={!canNext}
        onClick={() => onStep(1)}
      >
        <ChevronRight className="size-4" aria-hidden />
      </IconButton>
    </div>
  );
}

// Monday first; a null is a blank before the 1st
function monthCells(year: number, month: number): (Date | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const total = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => new Date(year, month, i + 1)),
  ];
}

function weekCells(focus: Date): Date[] {
  const start = focus.getDate() - ((focus.getDay() + 6) % 7);
  return Array.from(
    { length: 7 },
    (_, i) => new Date(focus.getFullYear(), focus.getMonth(), start + i),
  );
}

// Marks under each day of the given cells
function Days({
  cells,
  now,
  base,
}: {
  cells: (Date | null)[];
  now: Date;
  base: Base;
}) {
  const { i18n } = useTranslation();
  const summary = useMarkSummary();
  const lang = i18n.language;
  const { range, day } = base;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const past = range.from < 0;
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'short' }).format(
      new Date(2024, 0, 1 + i),
    ),
  );

  return (
    <div>
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
        {cells.map((date, i) => {
          if (date === null) return <span key={`blank-${i}`} />;
          const diff = Math.round((date.getTime() - today.getTime()) / DAY_MS);
          const here: Mark[] = base.marks
            .filter((mark) => sameDay(new Date(mark.at), date))
            .sort(byMark);
          const firstMark = here[0];
          const picked = day
            ? day.selected !== null && sameDay(day.selected, date)
            : here.some((mark) => mark.key === base.selectedKey);
          const pick = () => {
            if (day) day.onPick(date);
            else if (firstMark) base.onPick(firstMark.key);
          };
          return (
            <div
              key={i}
              {...(firstMark && {
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
                '@container flex flex-col items-center self-start rounded-lg py-1.5 text-sm tabular-nums',
                (past ? diff > 0 : diff < 0) && 'opacity-40',
                !past &&
                  diff === EXPIRING_SOON_DAYS &&
                  'outline-2 -outline-offset-2 outline-dashed outline-brand',
                firstMark &&
                  'transition-colors hover:bg-foreground/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-foreground motion-reduce:transition-none',
                picked &&
                  'bg-foreground/10 inset-ring-1 inset-ring-foreground/25',
              )}
            >
              <span
                className={cn(
                  'grid size-7 place-items-center rounded-full',
                  diff === 0 && 'bg-foreground font-semibold text-background',
                )}
              >
                {date.getDate()}
              </span>
              {here.length > 0 && (
                <span
                  className="mt-1 flex h-4 items-center justify-center"
                  aria-hidden
                >
                  {here.map((mark, n) => (
                    <span
                      key={mark.key}
                      className={cn(
                        'pointer-events-none grid size-4 cursor-pointer place-items-center md:pointer-events-auto',
                        here.length > 2 && n > 1 && 'hidden',
                        here.length > 2 && n === 1 && '@max-[3.5rem]:hidden',
                      )}
                      onPointerEnter={() => base.onActiveChange(mark.key)}
                      onPointerLeave={() => base.onActiveChange(null)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (day) day.onPick(date);
                        else base.onPick(mark.key);
                      }}
                    >
                      <MarkGlyph
                        mark={mark}
                        lit={base.activeKey === mark.key}
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
                <span className="sr-only">{summary(here)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const WIDE = '(min-width: 768px)';

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches);
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const update = () => setWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}

// The month from md; below it one week, the month opens on a press
export function MonthCalendar({
  loadedAt,
  ...base
}: Base & { loadedAt: number }) {
  const { t } = useTranslation();
  const { marks, range, selectedKey } = base;
  const now = new Date(loadedAt);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const wide = useWide();
  const panelId = useId();
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState(today);
  const [seen, setSeen] = useState(selectedKey);
  const month = wide || expanded;
  const allowed = (date: Date) =>
    inRange(monthsAhead(date.getFullYear(), date.getMonth(), now), range);
  const monthStart = (year: number, index: number) =>
    sameMonth(new Date(year, index, 1), now) ? today : new Date(year, index, 1);
  const stepTarget = (delta: number) =>
    month
      ? new Date(focus.getFullYear(), focus.getMonth() + delta, 1)
      : new Date(
          focus.getFullYear(),
          focus.getMonth(),
          focus.getDate() + 7 * delta,
        );
  const step = (delta: number) => {
    const target = stepTarget(delta);
    setFocus(
      month ? monthStart(target.getFullYear(), target.getMonth()) : target,
    );
  };
  // Selecting a mark brings its day into view
  if (selectedKey !== seen) {
    setSeen(selectedKey);
    const at = marks.find((mark) => mark.key === selectedKey)?.at;
    if (at) {
      const date = new Date(at);
      const visible = month
        ? sameMonth(date, focus)
        : weekCells(focus).some((cell) => sameDay(cell, date));
      if (!visible && allowed(date)) setFocus(date);
    }
  }
  return (
    <div data-surface="ground" className="text-foreground">
      <Header
        shown={{ year: focus.getFullYear(), month: focus.getMonth() }}
        now={now}
        base={base}
        onShow={(next) => setFocus(monthStart(next.year, next.month))}
        canPrev={allowed(stepTarget(-1))}
        canNext={allowed(stepTarget(1))}
        onStep={step}
      />
      <div id={panelId}>
        <Days
          cells={
            month
              ? monthCells(focus.getFullYear(), focus.getMonth())
              : weekCells(focus)
          }
          now={now}
          base={base}
        />
      </div>
      {!wide && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => setExpanded((value) => !value)}
          className={cn(
            'mx-auto flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-medium',
            PRESS,
          )}
        >
          {expanded ? (
            <ChevronUp aria-hidden className="size-4" />
          ) : (
            <ChevronDown aria-hidden className="size-4" />
          )}
          {t(
            expanded ? 'personal.calendarCollapse' : 'personal.calendarExpand',
          )}
        </button>
      )}
    </div>
  );
}

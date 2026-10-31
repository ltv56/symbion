import { cn } from 'cn';
import { COLUMNS, WINDOW } from './layout';
import { MonthButton } from './MonthButton';
import type { Base } from './types';

export function WindowView({ base, now }: { base: Base; now: Date }) {
  const months = Array.from(
    { length: WINDOW },
    (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1),
  );
  const years: { year: number; start: number; count: number }[] = [];
  months.forEach((date, i) => {
    const last = years[years.length - 1];
    if (last && last.year === date.getFullYear()) last.count += 1;
    else years.push({ year: date.getFullYear(), start: i, count: 1 });
  });
  // one line for the year change
  const change = months.findIndex((date, i) => i > 0 && date.getMonth() === 0);
  return (
    <div className="relative">
      {change > 0 && (
        <span
          className="absolute inset-y-0 w-0 -translate-x-1/2 border-l-2 border-dashed border-card-foreground/70"
          style={{ left: `${(change / WINDOW) * 100}%` }}
          aria-hidden
        />
      )}
      <div className="mb-2 grid" style={COLUMNS}>
        {years.map((y, index) => (
          <div
            key={y.year}
            className={cn(
              // equal room on both sides of the year line
              'relative flex min-h-11 items-center px-2 pt-1 text-sm font-semibold',
              index > 0 && 'ml-1.5',
              index < years.length - 1 && 'mr-1.5',
              'before:absolute before:inset-x-0 before:top-0 before:h-0.5 before:bg-card-foreground/70',
            )}
            style={{ gridColumn: `${y.start + 1} / span ${y.count}` }}
          >
            {y.year}
          </div>
        ))}
      </div>
      <div className="grid auto-rows-[minmax(72px,auto)]" style={COLUMNS}>
        {months.map((date, i) => (
          <MonthButton
            key={i}
            date={date}
            now={now}
            base={base}
            // 6px each side of the year line
            className={cn(
              i === change - 1 && 'mr-1.5',
              i === change && 'ml-1.5',
            )}
          />
        ))}
      </div>
    </div>
  );
}

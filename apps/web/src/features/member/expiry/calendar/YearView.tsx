import { inHorizon, monthsAhead } from '../expiry';
import { COLUMNS } from './layout';
import { MonthButton } from './MonthButton';
import { NavBar } from './NavBar';
import type { Base, Open } from './types';

// Twelve months of one year; months outside the horizon are faded
export function YearView({
  year,
  base,
  now,
  open,
}: {
  year: number;
  base: Base;
  now: Date;
  open: Open;
}) {
  const firstYear = now.getFullYear();
  const lastYear = new Date(
    now.getFullYear(),
    now.getMonth() + 12,
    1,
  ).getFullYear();
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 1));
  return (
    <div>
      <NavBar
        title={String(year)}
        prevDisabled={year <= firstYear}
        nextDisabled={year >= lastYear}
        onPrev={() => open({ kind: 'year', year: year - 1 })}
        onNext={() => open({ kind: 'year', year: year + 1 })}
        onBack={() => open({ kind: 'window' })}
      />
      <div className="grid auto-rows-[minmax(72px,auto)]" style={COLUMNS}>
        {months.map((date) => (
          <MonthButton
            key={date.getMonth()}
            date={date}
            now={now}
            base={base}
            enabled={inHorizon(monthsAhead(year, date.getMonth(), now))}
            onOpen={(focus) =>
              open({
                kind: 'days',
                year,
                month: date.getMonth(),
                from: 'year',
                focus,
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

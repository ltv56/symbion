import { useState } from 'react';
import type { Base, CalendarView } from './types';
import { WindowView } from './WindowView';
import { YearView } from './YearView';

// Six months; a year opens its 12 months
export function ExpiryCalendar({
  lots,
  loadedAt,
  activeId,
  onActiveChange,
}: Base & { loadedAt: number }) {
  const [view, setView] = useState<CalendarView>({ kind: 'window' });
  const now = new Date(loadedAt);
  const base = { lots, activeId, onActiveChange };
  return (
    <div className="text-card-foreground">
      {view.kind === 'window' && (
        <WindowView base={base} now={now} open={setView} />
      )}
      {view.kind === 'year' && (
        <YearView year={view.year} base={base} now={now} open={setView} />
      )}
    </div>
  );
}

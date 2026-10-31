import type { Base } from './types';
import { WindowView } from './WindowView';

// Six months from the current one
export function ExpiryCalendar({
  lots,
  loadedAt,
  activeId,
  onActiveChange,
}: Base & { loadedAt: number }) {
  const now = new Date(loadedAt);
  const base = { lots, activeId, onActiveChange };
  return (
    <div className="text-card-foreground">
      <WindowView base={base} now={now} />
    </div>
  );
}

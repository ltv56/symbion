import { ExpiryTimeline } from './expiry/ExpiryTimeline';
import { HistoryPanel } from './history/HistoryPanel';

// The calendar, the point lots and the history
export function PersonalPage() {
  return (
    <section className="max-w-2xl space-y-6 py-6 md:py-10">
      <ExpiryTimeline />
      <HistoryPanel />
    </section>
  );
}

import type { Lot } from '../useLots';

export type CalendarView = { kind: 'window' } | { kind: 'year'; year: number };

// Pointing lights a marker and its row
type Link = {
  activeId: number | null;
  onActiveChange: (id: number | null) => void;
};
export type Base = Link & { lots: Lot[] };
export type Open = (view: CalendarView) => void;

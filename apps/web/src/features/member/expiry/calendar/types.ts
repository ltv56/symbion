import type { Lot } from '../useLots';

export type CalendarView =
  | { kind: 'window' }
  | { kind: 'year'; year: number }
  | {
      kind: 'days';
      year: number;
      month: number;
      from: 'window' | 'year';
      // the lot whose marker was pressed
      focus?: number;
    };

// Pointing lights a marker and its row; pressing a day or a row picks its lot
type Link = {
  activeId: number | null;
  selectedId: number | null;
  onActiveChange: (id: number | null) => void;
  onPick: (id: number) => void;
};
export type Base = Link & { lots: Lot[] };
export type Open = (view: CalendarView) => void;

import type { Mark } from '../marks';

export type CalendarView =
  | { kind: 'window' }
  | { kind: 'year'; year: number }
  | {
      kind: 'days';
      year: number;
      month: number;
      from: 'window' | 'year';
      // the mark that was pressed
      focus?: string;
    };

// Pointing lights a marker and its row; pressing a day or a row picks its mark
type Link = {
  activeKey: string | null;
  selectedKey: string | null;
  onActiveChange: (key: string | null) => void;
  onPick: (key: string) => void;
};
export type Base = Link & { marks: Mark[] };
export type Open = (view: CalendarView) => void;

import type { Mark } from '../marks';
import type { Range } from '../range';

// Pointing lights a marker and its row; pressing a day or a row picks its mark
type Link = {
  activeKey: string | null;
  selectedKey: string | null;
  onActiveChange: (key: string | null) => void;
  onPick: (key: string) => void;
};

// History: a day press filters the list instead of picking a mark
export type DayPick = {
  selected: Date | null;
  onPick: (date: Date) => void;
};

export type Base = Link & { marks: Mark[]; range: Range; day?: DayPick };

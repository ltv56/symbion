import type { Lot } from '../useLots';

// Pointing lights a marker and its row
type Link = {
  activeId: number | null;
  onActiveChange: (id: number | null) => void;
};
export type Base = Link & { lots: Lot[] };

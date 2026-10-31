import { cn } from 'cn';
import { useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';

// A pointed row is one rounded piece
const LIT = 'bg-card-foreground/10 inset-ring-1 inset-ring-card-foreground/25';
const ROW = [
  // the divider sits in the middle of the gap
  'relative -mx-2 my-1 rounded-lg px-2 transition-colors motion-reduce:transition-none',
  'before:absolute before:inset-x-2 before:-top-1 before:h-px before:bg-border first:before:hidden',
  'hover:bg-card-foreground/10 hover:inset-ring-1 hover:inset-ring-card-foreground/25 hover:before:invisible [li:hover+&]:before:invisible',
].join(' ');
const ROW_BUTTON =
  'cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-card-foreground';

// Rows and the calendar light each other through one id
export function useActiveLot() {
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [pinnedId, setPinnedId] = useState<number | null>(null);
  const activeId = hoverId ?? pinnedId;
  const toggle = (id: number) =>
    setPinnedId((current) => (current === id ? null : id));
  const mouse = (id: number | null) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') setHoverId(id);
  };
  const row = (id: number, previousId?: number) => ({
    item: {
      className: cn(
        ROW,
        activeId === id && cn(LIT, 'before:invisible'),
        previousId !== undefined &&
          activeId === previousId &&
          'before:invisible',
      ),
      onPointerEnter: mouse(id),
      onPointerLeave: mouse(null),
    },
    press: {
      role: 'button',
      tabIndex: 0,
      'aria-pressed': pinnedId === id,
      className: ROW_BUTTON,
      onClick: () => toggle(id),
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle(id);
        }
      },
    },
  });
  return {
    activeId,
    pinnedId,
    setHoverId,
    toggle,
    row,
    calendar: {
      activeId,
      selectedId: pinnedId,
      onActiveChange: setHoverId,
      onPick: toggle,
    },
  };
}

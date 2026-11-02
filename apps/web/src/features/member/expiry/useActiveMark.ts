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

const pressKey = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

// Rows and the calendar light each other through one key
export function useActiveMark() {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const activeKey = hoverKey ?? pinnedKey;
  const toggle = (key: string) =>
    setPinnedKey((current) => (current === key ? null : key));
  const mouse = (key: string | null) => (event: PointerEvent) => {
    if (event.pointerType === 'mouse') setHoverKey(key);
  };
  const row = (key: string, previousKey?: string) => ({
    item: {
      className: cn(
        ROW,
        activeKey === key && cn(LIT, 'before:invisible'),
        previousKey !== undefined &&
          activeKey === previousKey &&
          'before:invisible',
      ),
      onPointerEnter: mouse(key),
      onPointerLeave: mouse(null),
    },
    press: {
      role: 'button',
      tabIndex: 0,
      'aria-pressed': pinnedKey === key,
      className: ROW_BUTTON,
      onClick: () => toggle(key),
      onKeyDown: pressKey(() => toggle(key)),
    },
  });
  return {
    activeKey,
    pinnedKey,
    setHoverKey,
    toggle,
    row,
    calendar: {
      activeKey,
      selectedKey: pinnedKey,
      onActiveChange: setHoverKey,
      onPick: toggle,
    },
  };
}

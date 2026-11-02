import { cn } from 'cn';
import { useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';

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
// A pointed ticket sits on the page ground
const TICKET =
  'cursor-pointer transition-[outline-color] motion-reduce:transition-none';
const TICKET_LIT = 'outline-2 outline-offset-2 outline-foreground';

const pressKey = (action: () => void) => (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
};

// Rows, tickets and the calendar light each other through one key
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
  // The whole ticket takes a press
  const ticket = (key: string) => ({
    item: {
      className: cn(TICKET, activeKey === key && TICKET_LIT),
      onPointerEnter: mouse(key),
      onPointerLeave: mouse(null),
      onClick: (event: MouseEvent) => {
        if ((event.target as HTMLElement).closest('button')) return;
        if (window.getSelection()?.toString()) return;
        toggle(key);
      },
    },
    stop: {
      role: 'button',
      tabIndex: 0,
      'aria-pressed': pinnedKey === key,
      onKeyDown: pressKey(() => toggle(key)),
    },
  });
  // A tab change drops what was pointed at
  const clear = () => {
    setHoverKey(null);
    setPinnedKey(null);
  };
  return {
    activeKey,
    pinnedKey,
    setHoverKey,
    toggle,
    clear,
    row,
    ticket,
    calendar: {
      activeKey,
      selectedKey: pinnedKey,
      onActiveChange: setHoverKey,
      onPick: toggle,
    },
  };
}

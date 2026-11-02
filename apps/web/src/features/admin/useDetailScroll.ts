import { useRef } from 'react';

// Stacked, the detail sits below the list: bring it into view after a choice
export function useDetailScroll() {
  const detail = useRef<HTMLElement>(null);

  function reveal() {
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    detail.current?.scrollIntoView({
      block: 'nearest',
      behavior: calm ? 'auto' : 'smooth',
    });
  }

  return { detail, reveal };
}

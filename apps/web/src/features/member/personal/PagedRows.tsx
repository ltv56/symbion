import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// Row pitch before two rows are drawn
const FALLBACK_PITCH = 76;

// Rows that fit the list area, from the pitch between drawn rows
function useFitRows(ref: RefObject<HTMLElement | null>, count: number) {
  const [rows, setRows] = useState(5);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const items = [...element.querySelectorAll('li')].map((item) =>
        item.getBoundingClientRect(),
      );
      const [first, second] = items;
      const pitch = first && second ? second.top - first.top : FALLBACK_PITCH;
      const gap = first ? Math.max(0, pitch - first.height) : 0;
      const start = first ? first.top - element.getBoundingClientRect().top : 0;
      setRows(
        Math.max(3, Math.floor((element.clientHeight - start + gap) / pitch)),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, count]);
  return rows;
}

// Pages sized to the room there is
export function PagedRows<T extends { id: number }>({
  items,
  label,
  children,
}: {
  items: T[];
  label: string;
  children: (items: T[]) => ReactNode;
}) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const rows = useFitRows(listRef, items.length);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / rows));
  const current = Math.min(page, pages - 1);
  const visible = items.slice(current * rows, current * rows + rows);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="min-h-0 flex-1 overflow-hidden">
        {children(visible)}
      </div>
      {pages > 1 && (
        <nav
          aria-label={label}
          className="flex items-center justify-between gap-3 border-t border-border py-2"
        >
          <Button
            size="icon"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft aria-hidden />
            <span className="sr-only">{t('personal.prev')}</span>
          </Button>
          <span aria-live="polite" className="font-mono text-sm tabular-nums">
            {t('personal.page', { page: current + 1, pages })}
          </span>
          <Button
            size="icon"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight aria-hidden />
            <span className="sr-only">{t('personal.next')}</span>
          </Button>
        </nav>
      )}
    </div>
  );
}

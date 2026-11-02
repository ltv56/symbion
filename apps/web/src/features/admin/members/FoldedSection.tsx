import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const SHOWN = 5;

// A titled list that shows its first rows and folds the rest
export function FoldedSection<T extends { id: number }>({
  title,
  items,
  emptyText,
  row,
}: {
  title: string;
  items: T[];
  emptyText: string;
  row: (item: T) => ReactNode;
}) {
  const { t } = useTranslation();
  const heading = useId();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, SHOWN);

  return (
    <section className="mt-6" aria-labelledby={heading}>
      <h3 id={heading} className="font-semibold">
        {title}
        <span className="ml-1.5 font-normal text-muted-foreground">
          ({items.length})
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-1 divide-y border-y text-sm">
          {shown.map((item) => (
            <li key={item.id} className="py-2">
              {row(item)}
            </li>
          ))}
        </ul>
      )}
      {items.length > SHOWN && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground"
        >
          {expanded
            ? t('admin.members.fold.less')
            : t('admin.members.fold.more', { count: items.length })}
        </button>
      )}
    </section>
  );
}

import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';

// A panel holding a query: loading, error, empty, content
export function PanelQuery<T>({
  title,
  query,
  isEmpty,
  emptyText,
  children,
}: {
  title: string;
  query: UseQueryResult<T>;
  isEmpty: (data: T) => boolean;
  emptyText: string;
  children: (data: T, loadedAt: number) => ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <section className="rounded-lg bg-card text-card-foreground">
      <h2 className="border-b border-border px-4 py-3 text-base font-semibold">
        {title}
      </h2>
      <div className="px-4">
        {query.isPending && (
          <div role="status" className="space-y-3 py-4">
            <span className="sr-only">{t('member.loading')}</span>
            <div className="h-10 animate-pulse rounded-lg bg-secondary" />
            <div className="h-10 animate-pulse rounded-lg bg-secondary" />
          </div>
        )}
        {query.isError && query.data === undefined && (
          <div className="space-y-3 py-4">
            <FormError>{t('errors.generic')}</FormError>
            <Button onClick={() => void query.refetch()}>
              {t('member.retry')}
            </Button>
          </div>
        )}
        {query.data !== undefined &&
          (isEmpty(query.data) ? (
            <p className="py-4 text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            children(query.data, query.dataUpdatedAt)
          ))}
      </div>
    </section>
  );
}

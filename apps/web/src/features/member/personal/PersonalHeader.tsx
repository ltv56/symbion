import { useTranslation } from 'react-i18next';
import { TierSeal } from '@/features/member/tier/TierSeal';
import { useMe } from '@/features/member/useMe';
import { formatPoints } from '@/lib/format';

// The dashboard's tier seal, smaller, with the name and the points
export function PersonalHeader() {
  const { t, i18n } = useTranslation();
  const me = useMe();

  if (!me.data) {
    return (
      <div data-surface="ground" className="mb-3">
        <h1 className="sr-only">{t('personal.title')}</h1>
        {me.isPending && (
          <div
            role="status"
            className="h-14 w-64 max-w-full animate-pulse rounded-lg bg-foreground/10"
          >
            <span className="sr-only">{t('member.loading')}</span>
          </div>
        )}
      </div>
    );
  }

  const { name, tier, balance } = me.data;
  const sign = balance < 0 ? '−' : '';
  return (
    <div data-surface="ground" className="mb-3 flex items-center gap-3">
      <div className="shrink-0 [&>svg]:size-14">
        <TierSeal name={tier.name} />
      </div>
      <div className="min-w-0">
        <h1 className="line-clamp-2 text-lg leading-snug font-semibold wrap-anywhere">
          {name}
        </h1>
        <p className="flex flex-wrap items-baseline gap-x-1.5 leading-snug">
          <span className="font-mono text-base font-bold tabular-nums wrap-anywhere">
            {sign}
            {formatPoints(Math.abs(balance), i18n.language)}
          </span>
          <span className="text-sm text-muted-foreground">
            {t('timeline.unit', { count: Math.abs(balance) })}
          </span>
        </p>
      </div>
    </div>
  );
}

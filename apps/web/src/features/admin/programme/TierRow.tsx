import { useTranslation } from 'react-i18next';
import { formatVnd } from '@/lib/format';
import { RecordRow } from '../RecordRow';
import { formatRate } from './formatRate';
import type { Tier } from './useProgramme';

export function TierRow({
  tier,
  selected,
  onSelect,
}: {
  tier: Tier;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <RecordRow selected={selected} onSelect={onSelect}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="min-w-0 flex-1 basis-32">
          <span
            className="line-clamp-2 font-medium wrap-anywhere"
            title={tier.name}
          >
            {tier.name}
          </span>
          <span className="block text-[13px] text-muted-foreground">
            {tier.minSpend === 0
              ? t('admin.programme.tiers.fromStart')
              : t('admin.programme.tiers.from', {
                  spend: formatVnd(tier.minSpend, i18n.language),
                })}
          </span>
        </span>
        <span className="shrink-0 font-mono text-base font-medium tabular-nums">
          {formatRate(tier.earnRate, i18n.language)}
        </span>
      </span>
    </RecordRow>
  );
}

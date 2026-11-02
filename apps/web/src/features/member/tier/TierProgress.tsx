import { Trans, useTranslation } from 'react-i18next';
import { formatVnd } from '@/lib/format';
import type { Me } from '../useMe';
import { TierSeal } from './TierSeal';
import { tierLabel } from './tierLabel';

// The amounts and the target tier stand out
const BOLD = { b: <strong className="font-semibold" /> };

export function TierProgress({ me }: { me: Me }) {
  const { t, i18n } = useTranslation();
  const { spend12m, nextTier } = me;
  const money = (value: number) => formatVnd(value, i18n.language);

  let note: React.ReactNode;
  let progress: { percent: number; spent: string; target: string } | null =
    null;
  if (!nextTier) {
    note = (
      <Trans
        i18nKey="member.topTier"
        values={{ amount: money(spend12m) }}
        components={BOLD}
      />
    );
  } else {
    const missing = Math.max(0, nextTier.minSpend - spend12m);
    progress = {
      percent: Math.min(100, Math.floor((spend12m / nextTier.minSpend) * 100)),
      spent: money(spend12m),
      target: money(nextTier.minSpend),
    };
    note = (
      <Trans
        i18nKey={missing > 0 ? 'member.tierProgress' : 'member.tierReached'}
        values={{ amount: money(missing), tier: tierLabel(t, nextTier.name) }}
        components={BOLD}
      />
    );
  }

  return (
    <div className="mt-6 flex max-w-lg items-center gap-4">
      <TierSeal name={me.tier.name} />
      <div className="min-w-0 flex-1">
        {progress && nextTier && (
          <>
            <p className="mb-1.5 font-mono text-sm tabular-nums">
              {t('member.tierSpent', {
                spent: progress.spent,
                target: progress.target,
              })}
            </p>
            <div
              className="h-1.5 rounded-full bg-progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress.percent}
              aria-valuetext={`${progress.spent} / ${progress.target}`}
              aria-label={t('member.tierProgressLabel', {
                tier: tierLabel(t, nextTier.name),
              })}
            >
              <div
                className="h-full rounded-full bg-progress-fill"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </>
        )}
        <p className={progress ? 'mt-2 text-sm' : 'text-sm'}>{note}</p>
      </div>
    </div>
  );
}

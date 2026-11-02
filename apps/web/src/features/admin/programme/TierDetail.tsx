import { Pencil } from 'lucide-react';
import { useRef, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { TierSeal } from '@/features/member/tier/TierSeal';
import { Button } from '@/components/ui/button';
import { formatVnd } from '@/lib/format';
import { OUTLINE } from '../styles';
import { useDialog } from '../useDialog';
import { formatRate } from './formatRate';
import { TierDialog } from './TierDialog';
import type { Tier } from './useProgramme';

function Fact({ label, children }: { label: string; children: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="ml-auto max-w-full text-right font-mono tabular-nums wrap-anywhere">
        {children}
      </dd>
    </div>
  );
}

// One tier on the ground: its seal, the two numbers, and what they do
export function TierDetail({
  tier,
  ref,
}: {
  tier: Tier;
  ref?: Ref<HTMLElement>;
}) {
  const { t, i18n } = useTranslation();
  const edit = useDialog();
  const button = useRef<HTMLButtonElement>(null);

  return (
    <section
      ref={ref}
      data-surface="ground"
      aria-labelledby="tier-heading"
      className="scroll-mt-4 lg:sticky lg:top-4"
    >
      <div className="flex items-center gap-4">
        <TierSeal name={tier.name} />
        <h2
          id="tier-heading"
          className="min-w-0 text-xl font-semibold wrap-anywhere"
        >
          {tier.name}
        </h2>
      </div>
      <dl className="mt-4 divide-y border-y text-sm">
        <Fact label={t('admin.programme.tier.minSpend')}>
          {formatVnd(tier.minSpend, i18n.language)}
        </Fact>
        <Fact label={t('admin.programme.tier.earnRate')}>
          {formatRate(tier.earnRate, i18n.language)}
        </Fact>
      </dl>
      <p className="mt-4 text-sm text-muted-foreground">
        {t('admin.programme.tier.meaning', {
          spend: formatVnd(tier.minSpend, i18n.language),
          rate: formatRate(tier.earnRate, i18n.language),
        })}
      </p>
      <Button
        ref={button}
        variant="outline"
        className={`${OUTLINE} mt-4`}
        onClick={edit.show}
      >
        <Pencil />
        {t('admin.programme.tier.edit')}
      </Button>
      <TierDialog
        key={`edit-${tier.id}-${edit.session}`}
        tier={tier}
        open={edit.open}
        onClose={edit.close}
        onCloseFocus={() => button.current?.focus()}
      />
    </section>
  );
}

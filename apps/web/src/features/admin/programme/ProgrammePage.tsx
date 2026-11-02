import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { Button } from '@/components/ui/button';
import { PageHeader, TwoHalves } from '../layout';
import { useDetailScroll } from '../useDetailScroll';
import { useDialog } from '../useDialog';
import { RatePlate } from './RatePlate';
import { TierDetail } from './TierDetail';
import { TierDialog } from './TierDialog';
import { TierRow } from './TierRow';
import { useTiers } from './useProgramme';

// What a point is worth, and the tiers that scale what a member earns
export function ProgrammePage() {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const { detail, reveal } = useDetailScroll();
  const add = useDialog();
  const addButton = useRef<HTMLButtonElement>(null);
  const query = useTiers();
  const tiers = query.data;
  const selected = tiers?.find((tier) => tier.id === picked) ?? tiers?.[0];

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={t('admin.programme.title')}
        subtitle={tiers && t('admin.programme.count', { count: tiers.length })}
      >
        <Button ref={addButton} onClick={add.show}>
          <Plus />
          {t('admin.programme.tier.add')}
        </Button>
      </PageHeader>
      <RatePlate />
      <TwoHalves>
        <PanelQuery
          title={t('admin.programme.tiers.title')}
          query={query}
          isEmpty={(list) => list.length === 0}
          emptyText={t('admin.programme.tiers.empty')}
        >
          {(list) => (
            <>
              <p className="flex justify-between gap-x-4 border-b border-border py-2 text-xs text-muted-foreground">
                <span>{t('admin.programme.tiers.columnTier')}</span>
                <span>{t('admin.programme.tiers.columnRate')}</span>
              </p>
              <ul className="-mx-4">
                {list.map((tier) => (
                  <TierRow
                    key={tier.id}
                    tier={tier}
                    selected={tier.id === selected?.id}
                    onSelect={() => {
                      setPicked(tier.id);
                      reveal();
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </PanelQuery>
        {selected && <TierDetail ref={detail} tier={selected} />}
      </TwoHalves>
      <TierDialog
        key={`add-${add.session}`}
        tier={null}
        open={add.open}
        onClose={add.close}
        onCloseFocus={() => addButton.current?.focus()}
        onSaved={(saved) => setPicked(saved.id)}
      />
    </div>
  );
}

import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanelQuery } from '@/components/PanelQuery';
import { Button } from '@/components/ui/button';
import { PageHeader, TwoHalves } from '../layout';
import { useDetailScroll } from '../useDetailScroll';
import { useDialog } from '../useDialog';
import { CreateMerchantDialog } from './CreateMerchantDialog';
import { MerchantDetail } from './MerchantDetail';
import { MerchantRow } from './MerchantRow';
import { useMerchants } from './useMerchants';

// The partner merchants: shop details and API keys
export function MerchantsPage() {
  const { t, i18n } = useTranslation();
  const [picked, setPicked] = useState<number | null>(null);
  const { detail, reveal } = useDetailScroll();
  const create = useDialog();
  const addButton = useRef<HTMLButtonElement>(null);
  const query = useMerchants();
  const merchants = query.data
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  const selected = merchants?.find((m) => m.id === picked) ?? merchants?.[0];

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={t('admin.merchants.title')}
        subtitle={
          merchants && t('admin.merchants.count', { count: merchants.length })
        }
      >
        <Button ref={addButton} onClick={create.show}>
          <Plus />
          {t('admin.merchants.add')}
        </Button>
      </PageHeader>
      <TwoHalves>
        <PanelQuery
          title={t('admin.merchants.list')}
          query={{ ...query, data: merchants }}
          isEmpty={(list) => list.length === 0}
          emptyText={t('admin.merchants.empty')}
        >
          {(list) => (
            <ul className="-mx-4">
              {list.map((merchant) => (
                <MerchantRow
                  key={merchant.id}
                  merchant={merchant}
                  selected={merchant.id === selected?.id}
                  onSelect={() => {
                    setPicked(merchant.id);
                    reveal();
                  }}
                />
              ))}
            </ul>
          )}
        </PanelQuery>
        {selected && <MerchantDetail ref={detail} merchant={selected} />}
      </TwoHalves>
      <CreateMerchantDialog
        key={`create-${create.session}`}
        open={create.open}
        onClose={create.close}
        onCloseFocus={() => addButton.current?.focus()}
        onCreated={setPicked}
      />
    </div>
  );
}

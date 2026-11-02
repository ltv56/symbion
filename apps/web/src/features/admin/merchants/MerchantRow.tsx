import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { RecordRow } from '../RecordRow';
import type { Merchant } from './useMerchants';

export function MerchantRow({
  merchant,
  selected,
  onSelect,
}: {
  merchant: Merchant;
  selected: boolean;
  onSelect: () => void;
}) {
  const { t } = useTranslation();
  return (
    <RecordRow selected={selected} onSelect={onSelect}>
      <span className="flex items-center gap-3">
        <MerchantAvatar id={merchant.id} name={merchant.name} />
        <span className="min-w-0 flex-1">
          <span
            className="line-clamp-2 font-medium wrap-anywhere"
            title={merchant.name}
          >
            {merchant.name}
          </span>
          <span
            className="line-clamp-1 text-[13px] text-muted-foreground wrap-anywhere"
            title={merchant.address ?? undefined}
          >
            {merchant.address ?? t('admin.merchants.noAddress')}
          </span>
        </span>
      </span>
    </RecordRow>
  );
}

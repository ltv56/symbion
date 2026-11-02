import { KeyRound, Pencil } from 'lucide-react';
import { useRef, useState, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { MerchantAvatar } from '@/components/MerchantAvatar';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/format';
import { Fact } from '../Fact';
import { useDialog } from '../useDialog';
import { OUTLINE } from '../styles';
import { EditShopDialog } from './EditShopDialog';
import { RotateKeyDialog } from './RotateKeyDialog';
import type { Merchant } from './useMerchants';

function ShopPhoto({ src, name }: { src: string | null; name: string }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-muted">
      <img
        src={src}
        alt={t('admin.merchants.detail.photoAlt', { name })}
        onError={() => setFailed(true)}
        className="size-full object-cover"
      />
    </div>
  );
}

// One merchant on the ground: shop details, and the key
export function MerchantDetail({
  merchant,
  ref,
}: {
  merchant: Merchant;
  ref?: Ref<HTMLElement>;
}) {
  const { t, i18n } = useTranslation();
  const edit = useDialog();
  const rotate = useDialog();
  const editButton = useRef<HTMLButtonElement>(null);
  const rotateButton = useRef<HTMLButtonElement>(null);
  const none = t('admin.merchants.detail.none');

  return (
    <section
      ref={ref}
      data-surface="ground"
      aria-labelledby="merchant-heading"
      className="scroll-mt-4 lg:sticky lg:top-4"
    >
      <ShopPhoto
        key={merchant.id}
        src={merchant.photoUrl}
        name={merchant.name}
      />
      <div className="flex items-center gap-3">
        <MerchantAvatar id={merchant.id} name={merchant.name} />
        <h2
          id="merchant-heading"
          className="min-w-0 text-xl font-semibold wrap-anywhere"
        >
          {merchant.name}
        </h2>
      </div>
      <dl className="mt-4 divide-y border-y text-sm">
        <Fact label={t('admin.merchants.detail.id')}>
          {String(merchant.id)}
        </Fact>
        <Fact label={t('admin.merchants.detail.created')}>
          {formatDate(merchant.createdAt, i18n.language)}
        </Fact>
        <Fact label={t('admin.merchants.detail.address')}>
          {merchant.address ?? none}
        </Fact>
        <Fact label={t('admin.merchants.detail.photo')}>
          {merchant.photoUrl ?? none}
        </Fact>
      </dl>
      <div className="mt-4">
        <Button
          ref={editButton}
          variant="outline"
          className={OUTLINE}
          onClick={edit.show}
        >
          <Pencil />
          {t('admin.merchants.detail.edit')}
        </Button>
      </div>
      <section className="mt-6" aria-labelledby="merchant-key-heading">
        <h3 id="merchant-key-heading" className="font-semibold">
          {t('admin.merchants.detail.apiKey')}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('admin.merchants.detail.apiKeyText')}
        </p>
        <Button
          ref={rotateButton}
          variant="outline"
          className={`${OUTLINE} mt-3`}
          onClick={rotate.show}
        >
          <KeyRound />
          {t('admin.merchants.detail.rotate')}
        </Button>
      </section>
      <EditShopDialog
        key={`edit-${merchant.id}-${edit.session}`}
        merchant={merchant}
        open={edit.open}
        onClose={edit.close}
        onCloseFocus={() => editButton.current?.focus()}
      />
      <RotateKeyDialog
        key={`rotate-${merchant.id}-${rotate.session}`}
        merchant={merchant}
        open={rotate.open}
        onClose={rotate.close}
        onCloseFocus={() => rotateButton.current?.focus()}
      />
    </section>
  );
}

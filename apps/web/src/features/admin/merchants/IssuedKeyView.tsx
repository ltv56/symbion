import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DialogFooter } from '../DialogFooter';
import { KeyReveal } from './KeyReveal';
import type { IssuedKey } from './useMerchants';

// What a dialog shows once it holds a new key
export function IssuedKeyView({
  issued,
  onClose,
}: {
  issued: IssuedKey;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <header className="grid gap-1.5">
        <DialogTitle className="text-lg leading-snug font-semibold wrap-anywhere">
          {t('admin.merchants.key.title', { name: issued.name })}
        </DialogTitle>
        <DialogDescription>
          {t('admin.merchants.key.description')}
        </DialogDescription>
      </header>
      <KeyReveal apiKey={issued.apiKey} />
      <DialogFooter>
        <Button size="lg" onClick={onClose}>
          {t('admin.merchants.key.done')}
        </Button>
      </DialogFooter>
    </>
  );
}

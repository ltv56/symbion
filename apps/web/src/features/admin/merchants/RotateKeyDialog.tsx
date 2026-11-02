import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/components/DialogShell';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DialogFooter } from '../DialogFooter';
import { IssuedKeyView } from './IssuedKeyView';
import { useRotateKey, type IssuedKey, type Merchant } from './useMerchants';

// States the cost first: the old key stops at once
export function RotateKeyDialog({
  merchant,
  open,
  onClose,
  onCloseFocus,
}: {
  merchant: Merchant;
  open: boolean;
  onClose: () => void;
  onCloseFocus: () => void;
}) {
  const { t } = useTranslation();
  const rotate = useRotateKey(merchant.id);
  const [issued, setIssued] = useState<IssuedKey | null>(null);

  return (
    <DialogShell
      open={open}
      locked={rotate.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      {issued ? (
        <IssuedKeyView issued={issued} onClose={onClose} />
      ) : (
        <>
          <header className="grid gap-1.5">
            <DialogTitle className="text-lg leading-snug font-semibold">
              {t('admin.merchants.rotate.title')}
            </DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {t('admin.merchants.rotate.description', {
                name: merchant.name,
              })}
            </DialogDescription>
          </header>
          {rotate.isError && <FormError>{t('errors.generic')}</FormError>}
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              disabled={rotate.isPending}
              onClick={onClose}
            >
              {t('admin.merchants.cancel')}
            </Button>
            <Button
              size="lg"
              disabled={rotate.isPending}
              aria-busy={rotate.isPending}
              onClick={() => rotate.mutate(undefined, { onSuccess: setIssued })}
            >
              {t(
                rotate.isPending
                  ? 'admin.merchants.rotate.working'
                  : 'admin.merchants.rotate.confirm',
              )}
            </Button>
          </DialogFooter>
        </>
      )}
    </DialogShell>
  );
}

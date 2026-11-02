import { useTranslation } from 'react-i18next';
import { DialogShell } from '@/components/DialogShell';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { DialogFooter } from '../DialogFooter';
import { useUpdateVoucher, type AdminVoucher } from './useVouchers';

// States the cost first: retiring cannot be undone
export function RetireDialog({
  voucher,
  open,
  onClose,
  onCloseFocus,
}: {
  voucher: AdminVoucher;
  open: boolean;
  onClose: () => void;
  onCloseFocus: () => void;
}) {
  const { t } = useTranslation();
  const update = useUpdateVoucher(voucher.id);

  return (
    <DialogShell
      open={open}
      locked={update.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      <header className="grid gap-1.5">
        <DialogTitle className="text-lg leading-snug font-semibold wrap-anywhere">
          {t('admin.vouchers.retire.title', { title: voucher.title })}
        </DialogTitle>
        <DialogDescription>
          {t('admin.vouchers.retire.description')}
        </DialogDescription>
      </header>
      <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
        <li>{t('admin.vouchers.retire.effectList')}</li>
        <li>{t('admin.vouchers.retire.effectCodes')}</li>
        <li>{t('admin.vouchers.retire.effectFinal')}</li>
      </ul>
      {update.isError && <FormError>{t('errors.generic')}</FormError>}
      <DialogFooter>
        <Button
          variant="outline"
          size="lg"
          disabled={update.isPending}
          onClick={onClose}
        >
          {t('admin.programme.cancel')}
        </Button>
        <Button
          size="lg"
          disabled={update.isPending}
          aria-busy={update.isPending}
          onClick={() =>
            update.mutate({ status: 'expired' }, { onSuccess: onClose })
          }
        >
          {t(
            update.isPending
              ? 'admin.vouchers.retire.working'
              : 'admin.vouchers.retire.confirm',
          )}
        </Button>
      </DialogFooter>
    </DialogShell>
  );
}

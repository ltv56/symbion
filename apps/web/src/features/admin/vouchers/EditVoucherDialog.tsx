import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DialogShell } from '@/components/DialogShell';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '../DialogFooter';
import { Field } from '../Field';
import { MAX_STOCK, toLocalInput, wholeNumber } from './fields';
import {
  useUpdateVoucher,
  type AdminVoucher,
  type VoucherChange,
} from './useVouchers';

const V = 'admin.vouchers.edit.validation';

// Messages are i18n keys; an unchanged date is not checked again
function makeSchema(initialUntil: string) {
  return z
    .object({
      stock: wholeNumber(MAX_STOCK, `${V}.stock`),
      validUntil: z.string().min(1, { error: `${V}.validUntil` }),
    })
    .refine(
      (v) =>
        v.validUntil === initialUntil ||
        new Date(v.validUntil).getTime() > Date.now(),
      { error: `${V}.validUntil`, path: ['validUntil'] },
    );
}

// Stock and end date; the price and the face value stay as issued
export function EditVoucherDialog({
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
  const initialUntil = toLocalInput(voucher.validUntil);
  const schema = useMemo(() => makeSchema(initialUntil), [initialUntil]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      stock: String(voucher.stock),
      validUntil: initialUntil,
    },
  });

  const submit = handleSubmit((values) => {
    const change: VoucherChange = {};
    if (Number(values.stock) !== voucher.stock) {
      change.stock = Number(values.stock);
    }
    if (values.validUntil !== initialUntil) {
      change.validUntil = new Date(values.validUntil).toISOString();
    }
    if (Object.keys(change).length === 0) return onClose();
    update.mutate(change, { onSuccess: onClose });
  });

  return (
    <DialogShell
      open={open}
      locked={update.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <header className="grid gap-1.5">
          <DialogTitle className="text-lg leading-snug font-semibold wrap-anywhere">
            {t('admin.vouchers.edit.title', { title: voucher.title })}
          </DialogTitle>
          <DialogDescription>
            {t('admin.vouchers.edit.description')}
          </DialogDescription>
        </header>
        <Field
          id="edit-stock"
          label={t('admin.vouchers.edit.stock')}
          hint={t('admin.vouchers.edit.stockHint')}
          error={errors.stock?.message && t(errors.stock.message)}
        >
          <Input
            id="edit-stock"
            inputMode="numeric"
            autoComplete="off"
            className="font-mono tabular-nums"
            aria-invalid={!!errors.stock}
            aria-describedby={
              errors.stock ? 'edit-stock-error' : 'edit-stock-hint'
            }
            {...register('stock')}
          />
        </Field>
        <Field
          id="edit-until"
          label={t('admin.vouchers.edit.validUntil')}
          error={errors.validUntil?.message && t(errors.validUntil.message)}
        >
          <Input
            id="edit-until"
            type="datetime-local"
            aria-invalid={!!errors.validUntil}
            aria-describedby={
              errors.validUntil ? 'edit-until-error' : undefined
            }
            {...register('validUntil')}
          />
        </Field>
        {update.isError && <FormError>{t('errors.generic')}</FormError>}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={update.isPending}
            onClick={onClose}
          >
            {t('admin.programme.cancel')}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={update.isPending}
            aria-busy={update.isPending}
          >
            {t(
              update.isPending
                ? 'admin.vouchers.edit.saving'
                : 'admin.vouchers.edit.save',
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}

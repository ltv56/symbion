import { zodResolver } from '@hookform/resolvers/zod';
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
import { useUpdateMerchant, type Merchant } from './useMerchants';

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Messages are i18n keys; an empty field clears the value
const schema = z.object({
  photoUrl: z
    .string()
    .trim()
    .max(2048, { error: 'admin.merchants.edit.validation.photo' })
    .refine((value) => value === '' || isHttpUrl(value), {
      error: 'admin.merchants.edit.validation.photo',
    }),
  address: z
    .string()
    .trim()
    .max(255, { error: 'admin.merchants.edit.validation.address' }),
});

export function EditShopDialog({
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
  const update = useUpdateMerchant(merchant.id);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      photoUrl: merchant.photoUrl ?? '',
      address: merchant.address ?? '',
    },
  });

  const submit = handleSubmit(({ photoUrl, address }) =>
    update.mutate(
      { photoUrl: photoUrl || null, address: address || null },
      { onSuccess: onClose },
    ),
  );

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
            {t('admin.merchants.edit.title', { name: merchant.name })}
          </DialogTitle>
          <DialogDescription>
            {t('admin.merchants.edit.description')}
          </DialogDescription>
        </header>
        <Field
          id="shop-photo"
          label={t('admin.merchants.edit.photo')}
          hint={t('admin.merchants.edit.photoHint')}
          error={errors.photoUrl?.message && t(errors.photoUrl.message)}
        >
          <Input
            id="shop-photo"
            type="url"
            inputMode="url"
            autoComplete="off"
            aria-invalid={!!errors.photoUrl}
            aria-describedby={
              errors.photoUrl ? 'shop-photo-error' : 'shop-photo-hint'
            }
            {...register('photoUrl')}
          />
        </Field>
        <Field
          id="shop-address"
          label={t('admin.merchants.edit.address')}
          error={errors.address?.message && t(errors.address.message)}
        >
          <Input
            id="shop-address"
            autoComplete="off"
            aria-invalid={!!errors.address}
            aria-describedby={errors.address ? 'shop-address-error' : undefined}
            {...register('address')}
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
            {t('admin.merchants.cancel')}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={update.isPending}
            aria-busy={update.isPending}
          >
            {t(
              update.isPending
                ? 'admin.merchants.edit.saving'
                : 'admin.merchants.edit.save',
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}

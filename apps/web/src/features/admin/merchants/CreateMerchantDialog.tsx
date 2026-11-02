import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
import { IssuedKeyView } from './IssuedKeyView';
import { useCreateMerchant, type IssuedKey } from './useMerchants';

// Messages are i18n keys
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'admin.merchants.create.validation.name' })
    .max(255, { error: 'admin.merchants.create.validation.name' }),
});

// Name in, key out: the key is shown once
export function CreateMerchantDialog({
  open,
  onClose,
  onCloseFocus,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCloseFocus: () => void;
  onCreated: (id: number) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateMerchant();
  const [issued, setIssued] = useState<IssuedKey | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  const submit = handleSubmit(({ name }) =>
    create.mutate(name, {
      onSuccess: (key) => {
        setIssued(key);
        onCreated(key.id);
      },
    }),
  );

  return (
    <DialogShell
      open={open}
      locked={create.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      {issued ? (
        <IssuedKeyView issued={issued} onClose={onClose} />
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-4">
          <header className="grid gap-1.5">
            <DialogTitle className="text-lg leading-snug font-semibold">
              {t('admin.merchants.create.title')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.merchants.create.description')}
            </DialogDescription>
          </header>
          <Field
            id="merchant-name"
            label={t('admin.merchants.create.name')}
            error={errors.name?.message && t(errors.name.message)}
          >
            <Input
              id="merchant-name"
              autoComplete="off"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'merchant-name-error' : undefined}
              {...register('name')}
            />
          </Field>
          {create.isError && <FormError>{t('errors.generic')}</FormError>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={create.isPending}
              onClick={onClose}
            >
              {t('admin.merchants.cancel')}
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={create.isPending}
              aria-busy={create.isPending}
            >
              {t(
                create.isPending
                  ? 'admin.merchants.create.submitting'
                  : 'admin.merchants.create.submit',
              )}
            </Button>
          </DialogFooter>
        </form>
      )}
    </DialogShell>
  );
}

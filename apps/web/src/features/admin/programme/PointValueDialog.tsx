import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { DialogShell } from '@/components/DialogShell';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { formatVnd } from '@/lib/format';
import { DialogFooter } from '../DialogFooter';
import { Field } from '../Field';
import { useUpdatePointValue } from './useProgramme';

// Messages are i18n keys
const schema = z.object({
  value: z
    .string()
    .trim()
    .regex(/^\d{1,6}$/, { error: 'admin.programme.rate.validation' })
    .refine((v) => Number(v) >= 1 && Number(v) <= 100_000, {
      error: 'admin.programme.rate.validation',
    }),
});

// Says what a new value touches before it is applied
export function PointValueDialog({
  current,
  open,
  onClose,
  onCloseFocus,
}: {
  current: number;
  open: boolean;
  onClose: () => void;
  onCloseFocus: () => void;
}) {
  const { t, i18n } = useTranslation();
  const update = useUpdatePointValue();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { value: String(current) },
  });

  const submit = handleSubmit(({ value }) =>
    update.mutate(Number(value), { onSuccess: onClose }),
  );

  const refused =
    update.error instanceof ApiError && update.error.status === 409
      ? update.error.message
      : null;

  return (
    <DialogShell
      open={open}
      locked={update.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <header className="grid gap-1.5">
          <DialogTitle className="text-lg leading-snug font-semibold">
            {t('admin.programme.rate.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.programme.rate.dialogText', {
              value: formatVnd(current, i18n.language),
            })}
          </DialogDescription>
        </header>
        <Field
          id="point-value"
          label={t('admin.programme.rate.field')}
          error={errors.value?.message && t(errors.value.message)}
        >
          <Input
            id="point-value"
            inputMode="numeric"
            autoComplete="off"
            className="font-mono tabular-nums"
            aria-invalid={!!errors.value}
            aria-describedby={errors.value ? 'point-value-error' : undefined}
            {...register('value')}
          />
        </Field>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          <li>{t('admin.programme.rate.effectVouchers')}</li>
          <li>{t('admin.programme.rate.effectClosed')}</li>
        </ul>
        {refused && (
          <div className="space-y-1">
            <FormError>{t('admin.programme.rate.refused')}</FormError>
            <p className="font-mono text-xs break-words text-muted-foreground">
              {refused}
            </p>
          </div>
        )}
        {update.isError && !refused && (
          <FormError>{t('errors.generic')}</FormError>
        )}
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
                ? 'admin.programme.rate.applying'
                : 'admin.programme.rate.apply',
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}

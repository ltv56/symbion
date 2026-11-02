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
import { DialogFooter } from '../DialogFooter';
import { Field } from '../Field';
import {
  useCreateTier,
  useUpdateTier,
  type Tier,
  type TierInput,
} from './useProgramme';

const MAX_SPEND = 9_999_999_999;

// Messages are i18n keys; both numbers are typed as text and parsed here
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'admin.programme.tier.validation.name' })
    .max(255, { error: 'admin.programme.tier.validation.name' }),
  minSpend: z
    .string()
    .trim()
    .regex(/^\d{1,10}$/, { error: 'admin.programme.tier.validation.minSpend' })
    .refine((v) => Number(v) <= MAX_SPEND, {
      error: 'admin.programme.tier.validation.minSpend',
    }),
  earnRate: z
    .string()
    .trim()
    .regex(/^\d{1,3}([.,]\d{1,2})?$/, {
      error: 'admin.programme.tier.validation.earnRate',
    })
    .refine((v) => Number(v.replace(',', '.')) >= 0.01, {
      error: 'admin.programme.tier.validation.earnRate',
    }),
});

function parse(values: z.infer<typeof schema>): TierInput {
  return {
    name: values.name,
    minSpend: Number(values.minSpend),
    earnRate: Number(values.earnRate.replace(',', '.')),
  };
}

// One form for a new tier and for an edit
export function TierDialog({
  tier,
  open,
  onClose,
  onCloseFocus,
  onSaved,
}: {
  tier: Tier | null;
  open: boolean;
  onClose: () => void;
  onCloseFocus: () => void;
  onSaved?: (tier: Tier) => void;
}) {
  const { t } = useTranslation();
  const create = useCreateTier();
  const update = useUpdateTier(tier?.id ?? 0);
  const save = tier ? update : create;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tier?.name ?? '',
      minSpend: tier ? String(tier.minSpend) : '',
      earnRate: tier ? String(tier.earnRate) : '',
    },
  });

  const submit = handleSubmit((values) =>
    save.mutate(parse(values), {
      onSuccess: (saved) => {
        onSaved?.(saved);
        onClose();
      },
    }),
  );

  const conflict =
    save.error instanceof ApiError && save.error.status === 409
      ? save.error.message.includes('already starts')
        ? 'admin.programme.tier.conflictSpend'
        : 'admin.programme.tier.conflictName'
      : null;

  return (
    <DialogShell
      open={open}
      locked={save.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <header className="grid gap-1.5">
          <DialogTitle className="text-lg leading-snug font-semibold wrap-anywhere">
            {tier
              ? t('admin.programme.tier.editTitle', { name: tier.name })
              : t('admin.programme.tier.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.programme.tier.description')}
          </DialogDescription>
        </header>
        <Field
          id="tier-name"
          label={t('admin.programme.tier.name')}
          error={errors.name?.message && t(errors.name.message)}
        >
          <Input
            id="tier-name"
            autoComplete="off"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'tier-name-error' : undefined}
            {...register('name')}
          />
        </Field>
        <Field
          id="tier-spend"
          label={t('admin.programme.tier.minSpend')}
          hint={t('admin.programme.tier.minSpendHint')}
          error={errors.minSpend?.message && t(errors.minSpend.message)}
        >
          <Input
            id="tier-spend"
            inputMode="numeric"
            autoComplete="off"
            className="font-mono tabular-nums"
            aria-invalid={!!errors.minSpend}
            aria-describedby={
              errors.minSpend ? 'tier-spend-error' : 'tier-spend-hint'
            }
            {...register('minSpend')}
          />
        </Field>
        <Field
          id="tier-rate"
          label={t('admin.programme.tier.earnRate')}
          hint={t('admin.programme.tier.earnRateHint')}
          error={errors.earnRate?.message && t(errors.earnRate.message)}
        >
          <Input
            id="tier-rate"
            inputMode="decimal"
            autoComplete="off"
            className="font-mono tabular-nums"
            aria-invalid={!!errors.earnRate}
            aria-describedby={
              errors.earnRate ? 'tier-rate-error' : 'tier-rate-hint'
            }
            {...register('earnRate')}
          />
        </Field>
        {tier && (
          <p className="text-muted-foreground">
            {t('admin.programme.tier.effect')}
          </p>
        )}
        {conflict && <FormError>{t(conflict)}</FormError>}
        {save.isError && !conflict && (
          <FormError>{t('errors.generic')}</FormError>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={save.isPending}
            onClick={onClose}
          >
            {t('admin.programme.cancel')}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={save.isPending}
            aria-busy={save.isPending}
          >
            {t(
              save.isPending
                ? 'admin.programme.tier.saving'
                : 'admin.programme.tier.save',
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}

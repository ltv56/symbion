import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
import { useMerchants } from '../merchants/useMerchants';
import { useSettings } from '../programme/useProgramme';
import { Select } from '../Select';
import { Textarea } from '../Textarea';
import { useCreateVoucher, type VoucherInput } from './useVouchers';

const V = 'admin.vouchers.create.validation';
const MAX_STOCK = 4_294_967_295;

const whole = (max: number, error: string) =>
  z
    .string()
    .trim()
    .regex(/^\d{1,16}$/, { error })
    .refine((value) => Number(value) <= max, { error });

const positive = (error: string) =>
  whole(Number.MAX_SAFE_INTEGER, error).refine((value) => Number(value) >= 1, {
    error,
  });

function stepLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

// Messages are i18n keys; numbers are typed as text and parsed on submit
function makeSchema(pointValue: number | undefined) {
  return z
    .object({
      merchantId: z.string().regex(/^\d+$/, { error: `${V}.merchant` }),
      title: z
        .string()
        .trim()
        .min(1, { error: `${V}.title` })
        .max(255, { error: `${V}.title` }),
      description: z
        .string()
        .trim()
        .max(2000, { error: `${V}.description` }),
      steps: z.string().refine(
        (text) => {
          const lines = stepLines(text);
          return lines.length <= 10 && lines.every((l) => l.length <= 200);
        },
        { error: `${V}.steps` },
      ),
      faceValue: positive(`${V}.faceValue`),
      pointsPrice: positive(`${V}.pointsPrice`),
      stock: whole(MAX_STOCK, `${V}.stock`),
      validUntil: z.string().refine((v) => new Date(v).getTime() > Date.now(), {
        error: `${V}.validUntil`,
      }),
    })
    .refine(
      (v) =>
        pointValue === undefined ||
        Number(v.faceValue) >= Number(v.pointsPrice) * pointValue,
      { error: `${V}.floor`, path: ['faceValue'] },
    );
}

type Values = z.infer<ReturnType<typeof makeSchema>>;

function toInput(values: Values): VoucherInput {
  const steps = stepLines(values.steps);
  return {
    merchantId: Number(values.merchantId),
    title: values.title,
    ...(values.description && { description: values.description }),
    ...(steps.length > 0 && { steps }),
    faceValue: Number(values.faceValue),
    pointsPrice: Number(values.pointsPrice),
    stock: Number(values.stock),
    validUntil: new Date(values.validUntil).toISOString(),
  };
}

// Creates on behalf of a merchant; the floor follows the current point value
export function CreateVoucherDialog({
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
  const { t, i18n } = useTranslation();
  const merchants = useMerchants();
  const settings = useSettings();
  const pointValue = settings.data?.pointValueVnd;
  const create = useCreateVoucher();
  const schema = useMemo(() => makeSchema(pointValue), [pointValue]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      merchantId: '',
      title: '',
      description: '',
      steps: '',
      faceValue: '',
      pointsPrice: '',
      stock: '',
      validUntil: '',
    },
  });

  const price = Number(useWatch({ control, name: 'pointsPrice' }));
  const floor =
    pointValue !== undefined && Number.isSafeInteger(price) && price > 0
      ? price * pointValue
      : null;

  const submit = handleSubmit((values) =>
    create.mutate(toInput(values), {
      onSuccess: (voucher) => {
        onCreated(voucher.id);
        onClose();
      },
    }),
  );

  const refused =
    create.error instanceof ApiError && create.error.status === 400
      ? create.error.message
      : null;
  const options = merchants.data
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));

  return (
    <DialogShell
      wide
      open={open}
      locked={create.isPending}
      onClose={onClose}
      onCloseFocus={onCloseFocus}
    >
      <form onSubmit={submit} noValidate className="grid gap-4">
        <header className="grid gap-1.5">
          <DialogTitle className="text-lg leading-snug font-semibold">
            {t('admin.vouchers.create.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.vouchers.create.description')}
          </DialogDescription>
        </header>
        <Field
          id="voucher-merchant-new"
          label={t('admin.vouchers.create.merchant')}
          error={errors.merchantId?.message && t(errors.merchantId.message)}
        >
          <Select
            id="voucher-merchant-new"
            aria-invalid={!!errors.merchantId}
            aria-describedby={
              errors.merchantId ? 'voucher-merchant-new-error' : undefined
            }
            {...register('merchantId')}
          >
            <option value="">{t('admin.vouchers.create.pickMerchant')}</option>
            {options?.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="voucher-title"
          label={t('admin.vouchers.create.titleField')}
          error={errors.title?.message && t(errors.title.message)}
        >
          <Input
            id="voucher-title"
            autoComplete="off"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'voucher-title-error' : undefined}
            {...register('title')}
          />
        </Field>
        <Field
          id="voucher-description"
          label={t('admin.vouchers.create.descriptionField')}
          error={errors.description?.message && t(errors.description.message)}
        >
          <Textarea
            id="voucher-description"
            rows={3}
            aria-invalid={!!errors.description}
            aria-describedby={
              errors.description ? 'voucher-description-error' : undefined
            }
            {...register('description')}
          />
        </Field>
        <Field
          id="voucher-steps"
          label={t('admin.vouchers.create.stepsField')}
          hint={t('admin.vouchers.create.stepsHint')}
          error={errors.steps?.message && t(errors.steps.message)}
        >
          <Textarea
            id="voucher-steps"
            rows={3}
            aria-invalid={!!errors.steps}
            aria-describedby={
              errors.steps ? 'voucher-steps-error' : 'voucher-steps-hint'
            }
            {...register('steps')}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="voucher-price"
            label={t('admin.vouchers.create.pointsPrice')}
            error={errors.pointsPrice?.message && t(errors.pointsPrice.message)}
          >
            <Input
              id="voucher-price"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono tabular-nums"
              aria-invalid={!!errors.pointsPrice}
              aria-describedby={
                errors.pointsPrice ? 'voucher-price-error' : undefined
              }
              {...register('pointsPrice')}
            />
          </Field>
          <Field
            id="voucher-face"
            label={t('admin.vouchers.create.faceValue')}
            hint={
              floor === null
                ? undefined
                : t('admin.vouchers.create.floorHint', {
                    floor: formatVnd(floor, i18n.language),
                    value: pointValue,
                  })
            }
            error={errors.faceValue?.message && t(errors.faceValue.message)}
          >
            <Input
              id="voucher-face"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono tabular-nums"
              aria-invalid={!!errors.faceValue}
              aria-describedby={
                errors.faceValue
                  ? 'voucher-face-error'
                  : floor === null
                    ? undefined
                    : 'voucher-face-hint'
              }
              {...register('faceValue')}
            />
          </Field>
          <Field
            id="voucher-stock"
            label={t('admin.vouchers.create.stock')}
            error={errors.stock?.message && t(errors.stock.message)}
          >
            <Input
              id="voucher-stock"
              inputMode="numeric"
              autoComplete="off"
              className="font-mono tabular-nums"
              aria-invalid={!!errors.stock}
              aria-describedby={
                errors.stock ? 'voucher-stock-error' : undefined
              }
              {...register('stock')}
            />
          </Field>
          <Field
            id="voucher-until"
            label={t('admin.vouchers.create.validUntil')}
            error={errors.validUntil?.message && t(errors.validUntil.message)}
          >
            <Input
              id="voucher-until"
              type="datetime-local"
              aria-invalid={!!errors.validUntil}
              aria-describedby={
                errors.validUntil ? 'voucher-until-error' : undefined
              }
              {...register('validUntil')}
            />
          </Field>
        </div>
        {refused && (
          <div className="space-y-1">
            <FormError>{t('admin.vouchers.create.refused')}</FormError>
            <p className="font-mono text-xs break-words text-muted-foreground">
              {refused}
            </p>
          </div>
        )}
        {create.isError && !refused && (
          <FormError>{t('errors.generic')}</FormError>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={create.isPending}
            onClick={onClose}
          >
            {t('admin.programme.cancel')}
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={create.isPending}
            aria-busy={create.isPending}
          >
            {t(
              create.isPending
                ? 'admin.vouchers.create.submitting'
                : 'admin.vouchers.create.submit',
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}

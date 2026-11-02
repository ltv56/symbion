import { RefreshCw } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useVouchers } from '@/features/member/vouchers/useVouchers';
import { formatPoints } from '@/lib/format';
import { Field } from '../Field';
import { OUTLINE } from '../styles';
import { Select } from '../Select';
import { callMerchantApi, type TapeEntry } from './counterApi';
import { PATH_FIELDS, type FieldDef, type Operation } from './operations';

export interface LastCalls {
  orderId?: string;
  code?: string;
}

// The fields of one call, sent with the merchant's key
export function OperationForm({
  operation,
  values,
  onChange,
  apiKey,
  last,
  onResult,
}: {
  operation: Operation;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  apiKey: string;
  last: LastCalls;
  onResult: (entry: TapeEntry) => void;
}) {
  const { t, i18n } = useTranslation();
  const prefix = useId();
  const vouchers = useVouchers();
  const [sending, setSending] = useState(false);
  const pathField = PATH_FIELDS[operation.id];
  const missing = pathField !== undefined && !(values[pathField] ?? '').trim();
  const blocked = !apiKey || missing;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (blocked) return;
    setSending(true);
    const request = operation.build(values);
    const entry = await callMerchantApi({
      ...request,
      apiKey,
      idempotencyKey: operation.idempotent ? (values.key ?? '') : null,
    });
    setSending(false);
    onResult(entry);
  }

  function control(field: FieldDef, id: string) {
    const value = values[field.name] ?? '';
    if (field.kind === 'voucher') {
      return (
        <Select
          id={id}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
        >
          <option value="">{t('admin.counter.pickVoucher')}</option>
          {vouchers.data?.map((voucher) => (
            <option key={voucher.id} value={voucher.id}>
              {voucher.title} · {voucher.merchantName} ·{' '}
              {formatPoints(voucher.pointsPrice, i18n.language)}
            </option>
          ))}
        </Select>
      );
    }
    return (
      <Input
        id={id}
        value={value}
        autoComplete="off"
        spellCheck={false}
        inputMode={field.kind === 'whole' ? 'numeric' : undefined}
        className={
          field.kind === 'whole' || field.kind === 'code'
            ? 'font-mono tabular-nums'
            : undefined
        }
        onChange={(event) => onChange(field.name, event.target.value)}
      />
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-4">
      {operation.fields.map((field) => {
        const id = `${prefix}-${field.name}`;
        const offer = field.suggest ? last[field.suggest] : undefined;
        return (
          <Field
            key={field.name}
            id={id}
            label={t(`admin.counter.field.${field.name}`)}
          >
            {control(field, id)}
            {offer && offer !== values[field.name] && (
              <button
                type="button"
                onClick={() => onChange(field.name, offer)}
                className="text-sm underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground"
              >
                {t(`admin.counter.suggest.${field.suggest}`, { value: offer })}
              </button>
            )}
          </Field>
        );
      })}
      {operation.idempotent && (
        <Field
          id={`${prefix}-key`}
          label={t('admin.counter.field.key')}
          hint={t('admin.counter.keyHint')}
        >
          <div className="flex gap-2">
            <Input
              id={`${prefix}-key`}
              value={values.key ?? ''}
              autoComplete="off"
              spellCheck={false}
              aria-describedby={`${prefix}-key-hint`}
              className="font-mono text-xs"
              onChange={(event) => onChange('key', event.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className={`${OUTLINE} shrink-0 max-md:size-11`}
              aria-label={t('admin.counter.newKey')}
              title={t('admin.counter.newKey')}
              onClick={() => onChange('key', crypto.randomUUID())}
            >
              <RefreshCw />
            </Button>
          </div>
        </Field>
      )}
      {!apiKey && (
        <p className="text-sm text-muted-foreground">
          {t('admin.counter.needKey')}
        </p>
      )}
      <div>
        <Button
          type="submit"
          size="lg"
          disabled={blocked || sending}
          aria-busy={sending}
        >
          {t(sending ? 'admin.counter.sending' : 'admin.counter.send')}
        </Button>
      </div>
    </form>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { useMerchants } from '../merchants/useMerchants';
import { PageHeader, TwoHalves } from '../layout';
import { RecordRow } from '../RecordRow';
import { Select } from '../Select';
import { useDetailScroll } from '../useDetailScroll';
import type { TapeEntry } from './counterApi';
import { OperationForm, type LastCalls } from './OperationForm';
import { OPERATIONS, type OperationId } from './operations';
import { ReceiptTape } from './ReceiptTape';
import { useDemoAccounts } from '../useDemoAccounts';
import { useCounterKey } from './useCounterKey';

type AllValues = Record<OperationId, Record<string, string>>;

function initialValues(): AllValues {
  return Object.fromEntries(
    OPERATIONS.map((op) => [
      op.id,
      {
        ...Object.fromEntries(op.fields.map((f) => [f.name, f.initial])),
        ...(op.idempotent ? { key: crypto.randomUUID() } : {}),
      },
    ]),
  ) as AllValues;
}

function pick(entry: TapeEntry | undefined, name: string): string | undefined {
  const response = entry?.response;
  if (typeof response !== 'object' || response === null) return undefined;
  const value = (response as Record<string, unknown>)[name];
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : undefined;
}

// A merchant's till, driven by hand: the same calls a real POS sends
export function CounterPage() {
  const { t, i18n } = useTranslation();
  const merchants = useMerchants();
  const [merchantId, setMerchantId] = useState('');
  const [operationId, setOperationId] = useState<OperationId>('order');
  const [values, setValues] = useState(initialValues);
  const [entries, setEntries] = useState<TapeEntry[]>([]);
  const { detail, reveal } = useDetailScroll();

  const options = merchants.data
    ?.slice()
    .sort((a, b) => a.name.localeCompare(b.name, i18n.language));
  const activeId = merchantId || String(options?.[0]?.id ?? '');
  const demoKey = useDemoAccounts().data?.merchants.find(
    (m) => String(m.id) === activeId,
  )?.apiKey;
  const [apiKey, setApiKey] = useCounterKey(activeId, demoKey);
  const operation = OPERATIONS.find((op) => op.id === operationId)!;

  const last: LastCalls = {
    orderId: pick(
      entries.find((e) => e.path === '/orders' && e.status === 201),
      'id',
    ),
    code: pick(
      entries.find((e) => e.path === '/redemptions' && e.status < 300),
      'code',
    ),
  };

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={t('admin.counter.title')}
        subtitle={t('admin.counter.subtitle')}
      />
      <div
        data-surface="ground"
        className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:max-w-3xl"
      >
        <div className="space-y-2">
          <label
            htmlFor="counter-merchant"
            className="block text-sm font-medium"
          >
            {t('admin.counter.merchant')}
          </label>
          <Select
            id="counter-merchant"
            value={activeId}
            onChange={(event) => setMerchantId(event.target.value)}
          >
            {options?.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <label htmlFor="counter-key" className="block text-sm font-medium">
            {t('admin.counter.apiKey')}
          </label>
          <Input
            id="counter-key"
            type="password"
            value={apiKey}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="counter-key-hint"
            className="font-mono"
            onChange={(event) => setApiKey(event.target.value)}
          />
          <p id="counter-key-hint" className="text-sm text-muted-foreground">
            {t('admin.counter.apiKeyHint')}
            {demoKey !== undefined && apiKey === demoKey
              ? ` ${t('admin.counter.demoKey')}`
              : ''}
          </p>
        </div>
      </div>
      <TwoHalves>
        <section className="rounded-lg bg-card text-card-foreground">
          <h2 className="border-b border-border px-4 py-3 text-base font-semibold">
            {t('admin.counter.operations')}
          </h2>
          <ul>
            {OPERATIONS.map((op) => (
              <RecordRow
                key={op.id}
                selected={op.id === operationId}
                onSelect={() => {
                  setOperationId(op.id);
                  reveal();
                }}
              >
                <span className="block font-medium">
                  {t(`admin.counter.op.${op.id}.name`)}
                </span>
                <span className="block text-[13px] text-muted-foreground wrap-anywhere">
                  {t(`admin.counter.op.${op.id}.text`)}
                </span>
              </RecordRow>
            ))}
          </ul>
        </section>
        <section
          ref={detail}
          data-surface="ground"
          aria-labelledby="counter-op-heading"
          className="scroll-mt-4 lg:sticky lg:top-4"
        >
          <h2 id="counter-op-heading" className="text-xl font-semibold">
            {t(`admin.counter.op.${operation.id}.name`)}
          </h2>
          <p className="mt-1 mb-4 font-mono text-sm text-muted-foreground">
            {t(`admin.counter.op.${operation.id}.route`)}
          </p>
          <OperationForm
            key={operation.id}
            operation={operation}
            values={values[operation.id]}
            onChange={(name, value) =>
              setValues({
                ...values,
                [operation.id]: { ...values[operation.id], [name]: value },
              })
            }
            apiKey={apiKey}
            last={last}
            onResult={(entry) =>
              setEntries((list) => [entry, ...list].slice(0, 30))
            }
          />
        </section>
      </TwoHalves>
      <ReceiptTape entries={entries} onClear={() => setEntries([])} />
    </div>
  );
}

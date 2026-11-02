export type OperationId = 'member' | 'order' | 'refund' | 'redeem' | 'confirm';
export type FieldKind = 'text' | 'email' | 'whole' | 'voucher' | 'code';

export interface FieldDef {
  name: string;
  kind: FieldKind;
  initial: string;
  // The tape can offer a value from an earlier call
  suggest?: 'orderId' | 'code';
}

export interface Operation {
  id: OperationId;
  fields: FieldDef[];
  idempotent: boolean;
  build: (values: Record<string, string>) => {
    path: string;
    body?: Record<string, unknown>;
  };
}

// Digits become numbers; anything else goes out as typed so the server can refuse it
const num = (value: string) =>
  /^\d+$/.test(value.trim()) ? Number(value) : value;

export const OPERATIONS: Operation[] = [
  {
    id: 'member',
    idempotent: false,
    fields: [
      { name: 'email', kind: 'email', initial: '' },
      { name: 'name', kind: 'text', initial: '' },
    ],
    build: (v) => ({
      path: '/members',
      body: { email: v.email, name: v.name },
    }),
  },
  {
    id: 'order',
    idempotent: true,
    fields: [
      { name: 'email', kind: 'email', initial: 'member1@demo.example' },
      { name: 'amount', kind: 'whole', initial: '500000' },
    ],
    build: (v) => ({
      path: '/orders',
      body: { memberEmail: v.email, amount: num(v.amount ?? '') },
    }),
  },
  {
    id: 'refund',
    idempotent: true,
    fields: [
      { name: 'orderId', kind: 'whole', initial: '', suggest: 'orderId' },
      { name: 'amount', kind: 'whole', initial: '' },
    ],
    build: (v) => ({
      path: `/orders/${encodeURIComponent((v.orderId ?? '').trim())}/refunds`,
      body: { amount: num(v.amount ?? '') },
    }),
  },
  {
    id: 'redeem',
    idempotent: true,
    fields: [
      { name: 'email', kind: 'email', initial: 'member1@demo.example' },
      { name: 'voucherId', kind: 'voucher', initial: '' },
    ],
    build: (v) => ({
      path: '/redemptions',
      body: { memberEmail: v.email, voucherId: num(v.voucherId ?? '') },
    }),
  },
  {
    id: 'confirm',
    idempotent: false,
    fields: [{ name: 'code', kind: 'code', initial: '', suggest: 'code' }],
    build: (v) => ({
      path: `/redemptions/${encodeURIComponent((v.code ?? '').trim())}/confirm`,
    }),
  },
];

// Fields that sit in the address cannot be empty
export const PATH_FIELDS: Partial<Record<OperationId, string>> = {
  refund: 'orderId',
  confirm: 'code',
};

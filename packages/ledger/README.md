# @symbion/ledger

Append-only point ledger. Internal package, not published.

Each `earn` adds one lot of points. The balance is the sum of what remains in the lots, never a number that gets edited.

## Use

```ts
const ledger = new Ledger(storage); // storage implements LedgerStorage<Tx>

const { lot, duplicate } = await ledger.earn(tx, {
  merchantId: '1',
  memberId: '42',
  points: 100,
  idempotencyKey: 'order-7',
});

await ledger.balance(tx, '42'); // 100
```

- **Idempotent:** the same `(merchantId, idempotencyKey)` twice adds points once. The second call returns the original lot with `duplicate: true`.
- **Transaction from the caller:** `tx` is passed to every storage call. The ledger never opens or commits a transaction, so the caller can put earning and other writes in one transaction.
- **Storage:** `LedgerStorage<Tx>` is the only thing the ledger needs. `InMemoryLedgerStorage` is for tests. The MySQL adapter lives in the app.
- **Expiry:** a lot with `expiresAt` at or before `now` is ignored by `balance` and `spend`. `expiresAt: null` never expires.
- **FIFO spend:** `spend(tx, { memberId, points, now })` takes points from the lot that expires first (no expiry last, then lower id). It returns `consumed`, the points taken per lot. If the member does not have enough points it throws and changes nothing.

Not done yet: negative balance (debt lot), spend idempotency.

```bash
pnpm --filter @symbion/ledger test
pnpm --filter @symbion/ledger typecheck
```

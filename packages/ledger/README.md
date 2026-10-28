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
- **FIFO spend:** `spend(tx, { merchantId, memberId, points, idempotencyKey, now })` takes points from the lot that expires first (no expiry last, then lower id). It returns `consumed` (points taken per lot) and `debt`.
- **Negative balance:** if the member has too few points, `spend` does not throw. It drains the lots and adds one debt lot (`points` and `remaining` = minus the shortfall), so `balance` goes below 0. `debt` is the shortfall of that call (0 if none).

Known limit: only the debt lot carries the spend's `idempotencyKey`. Sending the same short spend again throws `DuplicateKeyError`, but a spend fully covered by the lots is not idempotent in the ledger yet. The caller keeps its own unique key for that (like `orders`). Spend and earn keys share one `(merchantId, idempotencyKey)` space, so use different keys.

- **Debt is paid by `earn`:** a new `earn` first pays the oldest debt lots, so the new lot has `remaining = points - paid` (`points` stays the full amount). A member never has a debt lot and a positive lot at the same time. A repeated `earn` key returns the original lot and does not pay the debt again.

```bash
pnpm --filter @symbion/ledger test
pnpm --filter @symbion/ledger typecheck
```

# @symbion/ledger

Point ledger made of lots. Internal package, not published.

Each `earn` adds one lot of points. Lots are never deleted or edited, except `remaining` (what is not spent yet), which `spend` and a debt-paying `earn` lower. The balance is the sum of `remaining`, never a number that gets edited.

## Use

```ts
const ledger = new Ledger(storage); // storage implements LedgerStorage<Tx>

const { lot, duplicate } = await ledger.earn(tx, {
  merchantId: '1',
  memberId: '42',
  points: 100,
  idempotencyKey: 'order-7',
  now: new Date(),
});

await ledger.balance(tx, '42', new Date()); // 100
```

- **Idempotent earn:** the same `(merchantId, idempotencyKey)` twice adds points once. The second call returns the original lot with `duplicate: true`.
- **Idempotent spend:** every `spend` writes one entry with its key (`points` = minus what was spent, `remaining` = minus the shortfall, 0 when the lots cover it). Sending the same spend again throws `DuplicateKeyError` and changes nothing. Earn and spend keys share one `(merchantId, idempotencyKey)` space, so use different keys.
- **Transaction from the caller:** `tx` is passed to every storage call. The ledger never opens or commits a transaction, so the caller can put earning and other writes in one transaction.
- **One member at a time:** `earn` and `spend` call `storage.lockMember(tx, memberId)` first. After it returns, no other earn or spend of that member runs until the caller's transaction ends. The MySQL adapter locks the member row (`SELECT ... FOR UPDATE`); the in-memory one does nothing because it has no concurrency.
- **Storage:** `LedgerStorage<Tx>` is the only thing the ledger needs. `InMemoryLedgerStorage` is for tests. The MySQL adapter lives in the app.
- **Expiry:** a lot with `expiresAt` at or before `now` is ignored by `balance` and `spend`. `expiresAt: null` never expires.
- **FIFO spend:** `spend(tx, { merchantId, memberId, points, idempotencyKey, now })` takes points from the lot that expires first (no expiry last, then lower id). It returns `consumed` (points taken per lot) and `debt`.
- **Negative balance:** if the member has too few points, `spend` does not throw. It drains the lots and the entry it writes keeps the shortfall as a negative `remaining` (a debt lot), so `balance` goes below 0. `debt` is the shortfall of that call (0 if none).
- **Debt is paid by `earn`:** a new `earn` first pays the oldest debt lots, so the new lot has `remaining = points - paid` (`points` stays the full amount). A member never has a debt lot and a spendable (not expired) positive lot at the same time. A repeated `earn` key returns the original lot and does not pay the debt again. An `earn` whose `expiresAt` is at or before its `now` is worth nothing, so it is stored but does not pay debt.

Concurrency: the ledger itself does no locking. The MySQL adapter must lock the member row first (`SELECT ... FOR UPDATE`) so that all `earn` and `spend` of one member run one after another; locking only the lots that a read returns is not enough. Points must be safe integers (`Number.isSafeInteger`); the sum of many lots is not bounded by the ledger, so the adapter should use `BIGINT` and check overflow.

```bash
pnpm --filter @symbion/ledger test
pnpm --filter @symbion/ledger typecheck
```

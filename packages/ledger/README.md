# @symbion/ledger

Point ledger made of lots. Internal package, not published.

Lots are append-only; only `remaining` (points not spent yet) changes, through `spend` or an `earn` that pays debt. Balance: sum of `remaining` over the lots not expired.

## Usage

```ts
const ledger = new Ledger(storage); // storage implements LedgerStorage<Tx>

const { lot, duplicate } = await ledger.earn(tx, {
  merchantId: '1',
  memberId: '42',
  points: 100,
  idempotencyKey: 'order-7',
  now: new Date(),
});

const { consumed, debt } = await ledger.spend(tx, {
  merchantId: '1',
  memberId: '42',
  points: 30,
  idempotencyKey: 'voucher-3',
  now: new Date(),
});

await ledger.balance(tx, '42', new Date()); // 70
```

`tx` is the caller's transaction. The ledger never opens or commits one.

## API

| Method                       | Returns                                           |
| ---------------------------- | ------------------------------------------------- |
| `earn(tx, input)`            | `{ lot, duplicate }`                              |
| `spend(tx, input)`           | `{ consumed: { lotId, points }[], debt }`         |
| `balance(tx, memberId, now)` | sum of `remaining` of the lots not expired at now |

## Rules

- **Idempotency:** `(merchantId, idempotencyKey)` is unique. Repeating an `earn` returns the original lot with `duplicate: true`. Repeating a `spend` throws `DuplicateKeyError` and changes nothing. Earn and spend keys share one key space.
- **Idempotency key:** 1-255 characters; `earn` and `spend` throw otherwise. Keys are compared exactly (case and trailing spaces count).
- **Points** must be safe integers (`Number.isSafeInteger`); `earn` and `spend` need a positive amount.
- **Expiry:** a lot with `expiresAt` at or before `now` is ignored by `balance` and `spend`. `expiresAt: null` never expires.
- **FIFO:** `spend` takes from the lot that expires first, then lots without expiry, ties by lower id.
- **Negative balance:** `spend` does not throw when points are short. It writes an entry whose `remaining` is minus the shortfall (a debt lot), so the balance can go below 0. `debt` is the shortfall of that call.
- **Debt:** `earn` pays the oldest debt lots first, so the new lot has `remaining = points - paid`. A member never has a debt lot next to a spendable lot. An `earn` that is already expired at `now` is stored but pays no debt.

## Storage

`LedgerStorage<Tx>`: every method takes the caller's `tx` first.

- `lockMember(tx, memberId)`: `earn` and `spend` call it first. After it returns, no other earn or spend of that member runs until the transaction ends.
- `findSpendableLots`, `findDebtLots`, `findLotByKey`: in a real database these must be locking reads.
- Lot `points`, `remaining` and ids should be `BIGINT`; reading a value outside the safe integer range should throw. `expiresAt` keeps milliseconds.

Adapters:

- `InMemoryLedgerStorage` (this package), for tests. It ignores `tx`, and `lockMember` does nothing, so concurrent calls for one member are not serialised.
- `MysqlLedgerStorage` (`apps/api/src/ledger/mysql-ledger.storage.ts`), table `ledger_lots` with `BIGINT` points, `UNIQUE (merchant_id, idempotency_key)` and `CHECK (points <> 0)`. `tx` is a TypeORM `EntityManager`. `lockMember` is `SELECT ... FOR UPDATE` on the member row; `findLotByKey`, `findSpendableLots` and `findDebtLots` are `FOR UPDATE` reads. Tested against MySQL in `apps/api/test/ledger-mysql.e2e-spec.ts`, including parallel earns and spends.

## Scripts

```bash
pnpm --filter @symbion/ledger build      # dist/, used by apps/api
pnpm --filter @symbion/ledger test
pnpm --filter @symbion/ledger typecheck
```

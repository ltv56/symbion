# Programme rules

How points are earned and used. Each section covers what is implemented.

## Earning

`points = floor(amount ÷ 10,000 × tier multiplier)`

- `amount`: VND the member actually paid (after any voucher).
- Tier multipliers: Bronze 1.0, Silver 1.25, Gold 1.5 (`tiers.earn_rate`, seeded by `pnpm seed`).
- Tier thresholds (`tiers.min_spend`, 12-month spend in VND): Bronze 0, Silver 1,000,000, Gold 5,000,000.
- Always rounded down. An order that earns less than 1 point earns 0.
- Integer arithmetic only: the multiplier is used as a whole percent (1.25 → 125), so no float rounding errors.

| Amount (VND) | Tier   | Points |
| ------------ | ------ | ------ |
| 250,000      | Bronze | 25     |
| 250,000      | Silver | 31     |
| 250,000      | Gold   | 37     |
| 9,999        | Gold   | 1      |
| 5,000        | Bronze | 0      |
| 250,000,000  | Bronze | 10,000 |

- At most 10,000 points per order (`MAX_POINTS_PER_ORDER`), applied after the multiplier.

- Awarded by `POST /orders`, in the same transaction as the order, at the member's tier when the order is received.
- One lot per order (ledger key `order:<order id>`). Repeating the `Idempotency-Key` awards nothing. Reusing it with a different member or amount is rejected (`422`).
- An order that earns 0 points creates no lot.
- Points expire 12 months after the order.

Implemented in `apps/api/src/earning/` as `TierEarningStrategy`.

## Tiers

`spend = order amounts of the last 12 months − refunds of those orders`

| Tier   | `min_spend` (VND) | Multiplier |
| ------ | ----------------- | ---------- |
| Bronze | 0                 | 1.0        |
| Silver | 1,000,000         | 1.25       |
| Gold   | 5,000,000         | 1.5        |

- The member's tier is the highest tier whose `min_spend` is at most their spend.
- Evaluated after every order, in the same transaction. The tier can go up or down.
- The order that crosses a threshold earns at the tier the member had before it.
- A repeated `Idempotency-Key` does not re-evaluate.
- Known limitation: with no new order, a tier stays as it is after older orders leave the window (no nightly job).

| Orders in the last 12 months (VND) | Tier   |
| ---------------------------------- | ------ |
| 999,999                            | Bronze |
| 999,999 + 1                        | Silver |
| 4,000,000 + 999,999                | Silver |
| 5,000,000                          | Gold   |

## Vouchers

- Point value: 100 VND per point (`program_settings.point_value_vnd`). Changed only by SQL; no endpoint yet.
- The app pays the merchant `points_price × point value` for each redeemed voucher.
- Floor: `face_value ≥ points_price × point value`. A discount above the floor is paid by the merchant.

| `points_price` | `face_value` | Accepted |
| -------------- | ------------ | -------- |
| 500            | 50,000       | yes      |
| 500            | 70,000       | yes      |
| 500            | 49,999       | no       |

- Created by the app admin on behalf of a merchant (`POST /vouchers`), `active` from creation.
- Existing vouchers are not re-checked when the point value changes.
- Listed (`GET /vouchers`) while `status` is `active` and `valid_until` is in the future. A voucher with stock 0 stays listed.

## Redemption

- A member pays the voucher's `points_price` from their balance and gets a code, through a merchant (`POST /redemptions`) or the member app (`POST /me/redemptions`).
- Allowed only when the balance covers the price. A negative balance blocks redemption.
- Allowed only while the voucher is `active`, before `valid_until` and with stock left. Each redemption takes one from stock.
- Points are spent oldest-expiry first (FIFO), in the same transaction as the stock change. Ledger key `redemption:<id>`, `merchant_id` of the voucher.
- The redemption stores the points and the point value at that moment; later changes to the voucher or `program_settings` don't change it.
- Code: 10 characters, `0-9` and `A-Z` without `I`, `L`, `O`, `U`. Status `issued`.
- Repeating the `Idempotency-Key` returns the same redemption and spends nothing. Reusing it for another voucher is rejected (`422`).
- Only the voucher's merchant confirms the code (`issued` → `used`, records `used_at`). Other merchants get `404`. Confirming again returns the same result.
- A code expires 30 days after redemption, or at the voucher's `valid_until` if that is sooner (`expires_at`). An unused code past `expires_at` shows status `expired`.
- Confirming an expired code is rejected (`409`). Its points are not returned. A used code stays `used`.

## Refunds

`points deducted = ceil(points earned by the order × total refunded ÷ order amount) − points deducted by earlier refunds`

- Sent by the order's merchant (`POST /orders/:orderId/refunds`).
- Accepted up to 90 days after the order (`409` after that).
- `total refunded` includes this refund. Rounding happens once on the total, so all refunds of an order together deduct at most the points it earned, and exactly those points when the whole amount is refunded.
- Always rounded up. A refund of an order that earned 0 points deducts 0.
- An order can be refunded several times; the refunds together cannot exceed the order amount (`422`).
- Repeating the `Idempotency-Key` returns the same refund and deducts nothing. Reusing it for another order or amount is rejected (`422`).
- Deducted in full even when the member already spent the points: the balance goes negative and blocks redemption until later orders cover it.

| Order (VND) | Earned | Refund (VND) | Deducted |
| ----------- | ------ | ------------ | -------- |
| 250,000     | 25     | 250,000      | 25       |
| 250,000     | 25     | 100,000      | 10       |
| 250,000     | 25     | 35,000       | 4        |
| 250,000     | 25     | 1            | 1        |
| 5,000       | 0      | 5,000        | 0        |

Several refunds of an order of 250,000 that earned 25:

| Refund (VND) | Total refunded | `ceil` on total | Deducted |
| ------------ | -------------- | --------------- | -------- |
| 83,333       | 83,333         | 9               | 9        |
| 83,333       | 166,666        | 17              | 8        |
| 83,334       | 250,000        | 25              | 8        |
| 1            | 250,001        | —               | `422`    |

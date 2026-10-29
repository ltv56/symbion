# Programme rules

How points are earned and used. Each section covers what is implemented.

## Earning

`points = floor(amount ÷ 10,000 × tier multiplier)`

- `amount`: VND the member actually paid (after any voucher).
- Tier multipliers: Bronze 1.0, Silver 1.25, Gold 1.5 (`tiers.earn_rate`, seeded by `pnpm seed`).
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

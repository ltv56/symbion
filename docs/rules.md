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
- Evaluated after every order and every refund, in the same transaction. The tier can go up or down.
- The order that crosses a threshold earns at the tier the member had before it.
- A repeated `Idempotency-Key` does not re-evaluate.
- Every night at 03:00 (Asia/Ho_Chi_Minh) a job re-evaluates every member above the lowest tier, so a member who stops buying drops once the old orders leave the 12-month window. It runs inside the api process, one transaction and one member lock per member, and logs how many members it checked and moved down.

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
- A voucher may carry a `description` and the `steps` to redeem it; both are optional and returned by `GET /vouchers*`.
- A merchant may carry a shop photo URL and an address, set by the app admin (`PATCH /merchants/:id`); `GET /vouchers*` returns them with each voucher.

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

## Favorites

- A member may mark any listed voucher as a favorite (`PUT /me/favorites/:voucherId`) and unmark it (`DELETE`). Both are repeatable without error.
- A favorite is one row per member and voucher; the same voucher is never listed twice.
- `GET /me/favorites` returns only vouchers that are still listed, newest favorite first. A favorite whose voucher expires disappears from the list and comes back only if the voucher is listed again.
- Favorites do not affect redemption, points or stock.

## Refunds

`points deducted = ceil(points earned by the order × total refunded ÷ order amount) − points deducted by earlier refunds`

- Sent by the order's merchant (`POST /orders/:orderId/refunds`).
- Accepted up to 90 days after the order (`409` after that).
- `total refunded` includes this refund. Rounding happens once on the total, so all refunds of an order together deduct at most the points it earned, and exactly those points when the whole amount is refunded.
- Always rounded up. A refund of an order that earned 0 points deducts 0.
- An order can be refunded several times; the refunds together cannot exceed the order amount (`422`).
- Repeating the `Idempotency-Key` returns the same refund and deducts nothing. Reusing it for another order or amount is rejected (`422`).
- Deducted in full even when the member already spent the points: the balance goes negative and blocks redemption until later orders cover it.
- Re-evaluates the member's tier (see Tiers): an order of 5,000,000 (Gold) refunded by 4,500,000 leaves Bronze.

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

## Reconciliation

Per merchant and calendar month in Asia/Ho_Chi_Minh (`GET /reconciliation?month=YYYY-MM`). Computed on request from the ledger, refunds and redemptions; nothing is stored.

`net = issued − refunded − redeemed` (VND)

| Line     | Points                                                               | VND                                    |
| -------- | -------------------------------------------------------------------- | -------------------------------------- |
| Issued   | `earn` lots created at the merchant's shop in the month              | points × current point value           |
| Refunded | `points_deducted` of refunds made in the month by the merchant       | points × current point value           |
| Redeemed | `points` of codes confirmed `used` in the month, voucher merchant    | points × point value on the redemption |
| Breakage | `points` of codes that expired unused in the month, voucher merchant | points × point value on the redemption |

- `net > 0`: the merchant owes the app. `net < 0`: the app owes the merchant.
- The merchant pays for every point issued at its shop, base and tier bonus alike. The app pays the merchant for every code confirmed at its counter, whichever merchant issued the points.
- Each event counts in the month it happened: a refund of an old order counts in the month of the refund, and a code counts in the month it was confirmed. A closed month does not change.
- Breakage is not part of `net`. The app pays nothing for a code that expired, so the points merchants issued for it stay with the app.
- A code counts as breakage in the month of its `expires_at`, once that time has passed. A code confirmed before it expired is `used`, not breakage.
- A merchant with no points issued, refunded, redeemed or expired in the month is left out.
- Known limitation: lots and refunds don't store the point value, so changing `program_settings.point_value_vnd` also changes the VND of closed months for those two lines. Redemptions keep their own value.

| Issued | Refunded | Redeemed | Net (VND at 100 per point) |
| ------ | -------- | -------- | -------------------------- |
| 1,000  | 200      | 0        | 80,000 (merchant pays)     |
| 0      | 0        | 500      | −50,000 (app pays)         |
| 1,000  | 100      | 300      | 60,000 (merchant pays)     |

## Member app

- The balance is the sum of the member's unexpired lots (`GET /me`). After a refund it can be negative: it is shown with a minus sign and redemption is blocked (see Redemption).
- Points expire soon when they expire within 60 days (`EXPIRING_SOON_DAYS`).
- The expiry calendar covers the next 12 months, the longest a lot lives (see Earning).
- The calendar marks the end of each lot that has one (hourglass) and of each unused, unexpired code (ticket). The Points and Vouchers tabs under it choose the marks shown and the list below: points by expiry, or "My codes". Pointing at or pressing a row, ticket or mark lights the other two; changing tab clears the selection.
- The tier bar shows the 12-month spend and the spend still needed for the next tier; the top tier has no next tier.
- Vouchers are grouped: ready to redeem (stock left and balance covers the price), not enough points (including a negative balance), sold out. Not-enough-points vouchers are ordered by price, so the smallest shortfall comes first.
- The home page shows 4 / 3 / 2 vouchers of the three groups; "See more" opens the all-vouchers page filtered to that group (filter: All, or one group).
- A voucher not covered by the balance shows how many points are missing.
- A ticket title, and "Details" on tickets that cannot be redeemed, open the voucher detail: a side panel from 768px wide, a full-screen page below.
- The detail shows the merchant photo (initial letter when unset or failing to load), value, valid-until date and the member's balance; address (with a map link), description and steps appear only when set.
- The heart in the detail adds the voucher to the member's favorites or removes it (see Favorites). The state is kept on the account, so it shows on every device.
- Redeem asks for confirmation: value, points deducted, balance after, code valid until (see Redemption), no refund if the code expires.
- The app sends one `Idempotency-Key` per voucher until the server answers; a retry after a lost response repeats it. `200` shows "already recorded", points are deducted once.
- A `409` reloads the balance and the vouchers: the dialog then says sold out, not enough points or voucher gone.
- "My codes" lists the member's latest 50 codes (`GET /me/redemptions`): unused codes first, the one that ends soonest on top, then used and expired codes in the order the api returns them. A redemption reloads the list.
- An unused code shows the full date and time it ends, and the time left when it ends within 7 days (hours when under a day). Only an unused code has a copy button.
- The list shows 10 codes; "Show all" shows the rest.
- "Partner merchants" lists every merchant of the programme (`GET /me/partners`), ordered by name: 8 are shown, "Show all" shows the rest.

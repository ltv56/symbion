# Manual testing

## Admin login

Needs `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `JWT_SECRET` in the api environment (see `infra/.env.example`).

```sh
# create the value for ADMIN_PASSWORD_HASH (the password is read from stdin)
printf '%s' 'my-password' | pnpm --silent --filter @symbion/api hash-password

# login -> 200 {"accessToken":"<jwt>"}
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"my-password"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

# error path -> 401 {"message":"Invalid credentials",...}
curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@example.com","password":"wrong"}'
```

## Member login (MySQL)

Needs `DEMO_MODE=true` in the api environment and member `an@x.com` (see Members).

```sh
# request a code -> 200 {"otp":"<6 digits>"} (without DEMO_MODE: {})
curl -s -X POST localhost:3000/auth/member/otp -H 'content-type: application/json' -d '{"email":"an@x.com"}'

# login -> 200 {"accessToken":"<jwt>"}
MTOKEN=$(curl -s -X POST localhost:3000/auth/member/login -H 'content-type: application/json' \
  -d '{"email":"an@x.com","otp":"<code>"}' | sed 's/.*"accessToken":"\([^"]*\)".*/\1/')

# error path -> 401 {"message":"Invalid or expired code",...} (same code again)
curl -s -X POST localhost:3000/auth/member/login -H 'content-type: application/json' \
  -d '{"email":"an@x.com","otp":"<code>"}'

# profile -> 200 {"id":1,"email":"an@x.com","tier":{"id":1,"name":"Bronze"},"balance":250,...}
curl -s localhost:3000/me -H "Authorization: Bearer $MTOKEN"

# latest 50 point entries -> 200 [{"type":"earn","points":250,"merchantName":"Shop A",...}]
curl -s localhost:3000/me/history -H "Authorization: Bearer $MTOKEN"

# error path -> 401 (admin token instead of a member token)
curl -s localhost:3000/me -H "Authorization: Bearer $TOKEN"

# redeem as the member (needs 500 points and voucher $VID, see Redemptions) -> 201; same key again -> 200
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/me/redemptions -H "Authorization: Bearer $MTOKEN" \
  -H 'Idempotency-Key: m-1' -H 'content-type: application/json' -d "{\"voucherId\":$VID}"

# error path -> 409 (not enough points, new key)
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/me/redemptions -H "Authorization: Bearer $MTOKEN" \
  -H 'Idempotency-Key: m-2' -H 'content-type: application/json' -d "{\"voucherId\":$VID}"
```

## Merchants (MySQL)

All `/merchants*` calls need the admin token (`$TOKEN`, see Admin login).

```sh
# create a merchant -> 201 {"id":1,"name":"Shop A","apiKey":"<64 hex chars>"}; the key is shown only once
curl -s -X POST localhost:3000/merchants -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Shop A"}'

# list / get never include the key or its hash
curl -s localhost:3000/merchants -H "Authorization: Bearer $TOKEN"
curl -s localhost:3000/merchants/1 -H "Authorization: Bearer $TOKEN"

# error path -> 401 (no token)
curl -s -X POST localhost:3000/merchants -H 'content-type: application/json' -d '{"name":"Shop A"}'

# error path -> 400 (blank name)
curl -s -X POST localhost:3000/merchants -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" -d '{"name":" "}'

# new api key -> 200 {"id":1,"name":"Shop A","apiKey":"<new key>"}; the old key now gets 401
curl -s -X POST localhost:3000/merchants/1/api-key -H "Authorization: Bearer $TOKEN"
curl -s -o /dev/null -w '%{http_code}\n' localhost:3000/members -H "x-api-key: $OLD_KEY"

# error path -> 404 (unknown merchant)
curl -s -X POST localhost:3000/merchants/999999/api-key -H "Authorization: Bearer $TOKEN"
```

## Tiers (MySQL)

```sh
# list (public) -> tiers by min_spend ascending
curl -s localhost:3000/tiers

# create (admin) -> 201 {"id":4,"name":"Platinum","minSpend":10000000,"earnRate":2}
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Platinum","minSpend":10000000,"earnRate":2}'

# error path -> 409 (same name, or same minSpend)
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Platinum","minSpend":20000000,"earnRate":2}'

# error path -> 401 (no token)
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -d '{"name":"X","minSpend":1,"earnRate":1}'

# error path -> 400 (earnRate has 3 decimals)
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"X","minSpend":1,"earnRate":1.234}'

# error path -> 404
curl -s localhost:3000/tiers/999999
```

## Vouchers (MySQL)

Point value: `SELECT point_value_vnd FROM program_settings` (default 100).

```sh
# create (admin) -> 201, faceValue at the floor (500 x 100)
curl -s -X POST localhost:3000/vouchers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"merchantId":1,"title":"50k off","faceValue":50000,"pointsPrice":500,"stock":100,"validUntil":"2030-12-31T00:00:00Z"}'

# error path -> 400 (faceValue below the floor)
curl -s -X POST localhost:3000/vouchers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"merchantId":1,"title":"10k off","faceValue":10000,"pointsPrice":500,"stock":100,"validUntil":"2030-12-31T00:00:00Z"}'

# error path -> 404 (unknown merchant)
curl -s -X POST localhost:3000/vouchers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"merchantId":999999,"title":"X","faceValue":50000,"pointsPrice":500,"stock":1,"validUntil":"2030-12-31T00:00:00Z"}'

# list (public), newest id first -> {"items":[...],"nextCursor":<id|null>}
curl -s 'localhost:3000/vouchers?limit=2'

# next page: pass nextCursor as after
curl -s 'localhost:3000/vouchers?limit=2&after=<nextCursor>'

# get one -> 200
curl -s localhost:3000/vouchers/1

# error path -> 400 (limit out of range)
curl -s 'localhost:3000/vouchers?limit=101'

# error path -> 404 (unknown, expired or past validUntil)
curl -s localhost:3000/vouchers/999999
```

## Members (MySQL)

Requires applied migrations (see Migrations), one merchant and one tier. Start the API with `pnpm start` (`PORT`, default 3000). New members get the tier with the smallest `min_spend`.

```sh
# create a member -> 201; the same email again -> 409
# (KEY is the apiKey returned once by POST /merchants; merchant_id comes from it)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -d '{"name":"An","email":"an@x.com"}'

# error path -> 401 (missing or unknown x-api-key)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' \
  -d '{"name":"An","email":"an@x.com"}'

# list the merchant's members
curl -s localhost:3000/members -H "x-api-key: $KEY"

# get one member
curl -s localhost:3000/members/1 -H "x-api-key: $KEY"

# error path -> 404 {"message":"Member with id 99 not found",...} (also for another merchant's member)
curl -s localhost:3000/members/99 -H "x-api-key: $KEY"

# error path -> 401 (missing x-api-key)
curl -s localhost:3000/members

# error path -> 400 (id is not an integer)
curl -s localhost:3000/members/abc -H "x-api-key: $KEY"

# error path -> 400 (name and email are required)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' -H "x-api-key: $KEY" -d '{}'
```

## Orders (MySQL)

Requires a merchant (`$KEY`) and a member `an@x.com` (see Members).

```sh
# create an order -> 201
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: order-1' -d '{"memberEmail":"an@x.com","amount":250000}'

# same key again -> 200 with the same order id, no second row
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: order-1' -d '{"memberEmail":"an@x.com","amount":250000}'

# same key, different amount -> 422
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: order-1' -d '{"memberEmail":"an@x.com","amount":5}'

# error path -> 400 (missing Idempotency-Key)
curl -s -X POST localhost:3000/orders -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -d '{"memberEmail":"an@x.com","amount":5000}'

# error path -> 404 (unknown member)
curl -s -X POST localhost:3000/orders -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -H 'Idempotency-Key: order-2' -d '{"memberEmail":"ghost@x.com","amount":5000}'
```

## Redemptions (MySQL)

Requires `$KEY`, member `an@x.com` with at least 500 points (e.g. two orders of 2,500,000) and an active voucher `$VID` with `pointsPrice` 500 (see Vouchers).

```sh
# redeem -> 201 {"code":"<10 chars>","points":500,"status":"issued",...}
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: r-1' -d "{\"memberEmail\":\"an@x.com\",\"voucherId\":$VID}"

# same key again -> 200 with the same id and code, no second spend
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: r-1' -d "{\"memberEmail\":\"an@x.com\",\"voucherId\":$VID}"

# error path -> 409 (not enough points, after spending them with new keys)
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: r-2' -d "{\"memberEmail\":\"an@x.com\",\"voucherId\":$VID}"
```

Confirm a code (`$CODE` from the redeem response). `$VKEY` is the key of the voucher's merchant, `$KEY` a different merchant.

```sh
# confirm -> 200 {"status":"used","usedAt":"<time>",...}
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions/$CODE/confirm -H "x-api-key: $VKEY"

# again -> 200 with the same usedAt
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions/$CODE/confirm -H "x-api-key: $VKEY"

# error path -> 404 (another merchant's key)
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions/$CODE/confirm -H "x-api-key: $KEY"
```

Expired code: move `expires_at` of a new, unused `$CODE` into the past.

```sh
docker compose -f infra/compose.yaml exec -T mysql sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" symbion' \
  <<< "UPDATE redemptions SET expires_at = NOW() - INTERVAL 1 MINUTE WHERE code = '$CODE'"

# error path -> 409 {"message":"Redemption code <code> has expired",...}
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/redemptions/$CODE/confirm -H "x-api-key: $VKEY"
```

## Refunds (MySQL)

Requires `$KEY` and member `an@x.com` (see Members).

```sh
# order of 250,000 -> 25 points; keep its id
OID=$(curl -s -X POST localhost:3000/orders -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -H 'Idempotency-Key: refund-order-1' -d '{"memberEmail":"an@x.com","amount":250000}' | sed 's/.*"id":\([0-9]*\).*/\1/')

# refund 35,000 -> 201 {"pointsDeducted":4,...}
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders/$OID/refunds -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: refund-1' -d '{"amount":35000}'

# error path -> 404 (unknown order)
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders/999999/refunds -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: refund-2' -d '{"amount":1}'

# error path -> 409 (order older than 90 days)
docker compose -f infra/compose.yaml exec mysql sh -c "mysql -u\"\$MYSQL_USER\" -p\"\$MYSQL_PASSWORD\" \"\$MYSQL_DATABASE\" \
  -e 'UPDATE orders SET created_at = NOW() - INTERVAL 91 DAY WHERE id = $OID'"
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders/$OID/refunds -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: refund-3' -d '{"amount":1}'
```

## Health and logs

```sh
# 200 {"status":"ok"}; 503 {"message":"Database unavailable",...} when MySQL is down (`pnpm db:down`)
curl -s -i localhost:3000/health

# JSON logs: one object per line, every line of a request has its requestId (DB_* exported, see Migrations)
cd apps/api && NODE_ENV=production PORT=3000 node dist/main
```

E2E tests (`pnpm check`) delete all rows in `vouchers`, `ledger_lots`, `orders`, `members`, `tiers` and `merchants`. Use a throwaway database only.

Ledger MySQL tests require applied migrations (`pnpm db:migrate`). Run only these: `pnpm --filter @symbion/api test ledger-mysql`.

## Migrations

```sh
pnpm db:up

pnpm db:migrate          # build, then apply pending migrations
pnpm db:migrate:revert   # undo the last migration
pnpm db:seed             # build, then upsert the default tiers (Bronze, Silver, Gold); safe to re-run

docker compose -f infra/compose.yaml exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW CREATE TABLE members\G"'
```

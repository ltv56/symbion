# Manual testing

## Merchants (MySQL)

```sh
# create a merchant -> 201 {"id":1,"name":"Shop A","apiKey":"<64 hex chars>"}; the key is shown only once
curl -s -X POST localhost:3000/merchants -H 'content-type: application/json' \
  -d '{"name":"Shop A"}'

# list / get never include the key or its hash
curl -s localhost:3000/merchants
curl -s localhost:3000/merchants/1

# error path -> 400 (blank name)
curl -s -X POST localhost:3000/merchants -H 'content-type: application/json' -d '{"name":" "}'
```

## Members (MySQL)

Requires applied migrations (see Migrations), one merchant and one tier. Start the API with `pnpm start` (`PORT`, default 3000). New members get the tier with the smallest `min_points`.

```sh
# create a member -> 201; the same email again -> 409
# (KEY is the apiKey returned once by POST /merchants; merchant_id comes from it)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -d '{"name":"An","email":"an@x.com"}'

# error path -> 401 (missing or unknown x-api-key)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' \
  -d '{"name":"An","email":"an@x.com"}'

# list all members
curl -s localhost:3000/members

# get one member
curl -s localhost:3000/members/1

# error path -> 404 {"message":"Member with id 99 not found",...}
curl -s localhost:3000/members/99

# error path -> 400 (id is not an integer)
curl -s localhost:3000/members/abc

# error path -> 400 (name and email are required)
curl -s -X POST localhost:3000/members -H 'content-type: application/json' -H "x-api-key: $KEY" -d '{}'
```

## Orders (MySQL)

Requires a merchant (`$KEY`) and a member `an@x.com` (see Members).

```sh
# create an order -> 201
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: order-1' -d '{"memberEmail":"an@x.com","amount":99.9}'

# same key again -> 200 with the same order id, no second row
curl -s -w ' [%{http_code}]\n' -X POST localhost:3000/orders -H 'content-type: application/json' \
  -H "x-api-key: $KEY" -H 'Idempotency-Key: order-1' -d '{"memberEmail":"an@x.com","amount":99.9}'

# error path -> 400 (missing Idempotency-Key)
curl -s -X POST localhost:3000/orders -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -d '{"memberEmail":"an@x.com","amount":5}'

# error path -> 404 (unknown member)
curl -s -X POST localhost:3000/orders -H 'content-type: application/json' -H "x-api-key: $KEY" \
  -H 'Idempotency-Key: order-2' -d '{"memberEmail":"ghost@x.com","amount":5}'
```

## Health and logs

```sh
# 200 {"status":"ok"}; 503 {"message":"Database unavailable",...} when MySQL is down (`pnpm db:down`)
curl -s -i localhost:3000/health

# JSON logs: one object per line, every line of a request has its requestId (DB_* exported, see Migrations)
cd apps/api && NODE_ENV=production PORT=3000 node dist/main
```

E2E tests (`pnpm check`) delete all rows in `ledger_lots`, `orders`, `members`, `tiers` and `merchants`. Use a throwaway database only.

Ledger MySQL tests require applied migrations (`pnpm db:migrate`). Run only these: `pnpm --filter @symbion/api test ledger-mysql`.

## Migrations

```sh
pnpm db:up
set -a; . infra/.env; set +a; export DB_HOST=127.0.0.1   # bash
. infra/env.ps1                                          # PowerShell

pnpm db:migrate          # build, then apply pending migrations
pnpm db:migrate:revert   # undo the last migration
pnpm db:seed             # build, then upsert the default tiers (Bronze, Silver, Gold); safe to re-run

docker exec symbion-mysql-1 mysql -u"$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW CREATE TABLE members\G"
```

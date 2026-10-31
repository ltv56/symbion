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
```

## Tiers (MySQL)

```sh
# list (public) -> tiers by min_points ascending
curl -s localhost:3000/tiers

# create (admin) -> 201 {"id":4,"name":"Platinum","minPoints":10000,"earnRate":2}
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Platinum","minPoints":10000,"earnRate":2}'

# error path -> 409 (same name, or same minPoints)
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Platinum","minPoints":20000,"earnRate":2}'

# error path -> 401 (no token)
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -d '{"name":"X","minPoints":1,"earnRate":1}'

# error path -> 400 (earnRate has 3 decimals)
curl -s -X POST localhost:3000/tiers -H 'content-type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"X","minPoints":1,"earnRate":1.234}'

# error path -> 404
curl -s localhost:3000/tiers/999999
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

pnpm db:migrate          # build, then apply pending migrations
pnpm db:migrate:revert   # undo the last migration
pnpm db:seed             # build, then upsert the default tiers (Bronze, Silver, Gold); safe to re-run
DEMO_API_KEY=demo-key-demo-key-1234 pnpm seed:demo   # tiers, merchant "Demo Shop" (key from DEMO_API_KEY, 16+ chars), 3 members; safe to re-run
NODE_ENV=production DEMO_API_KEY=... pnpm seed:demo  # refused: add --allow-production to the script arguments to run it

docker compose -f infra/compose.yaml exec mysql sh -c 'mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" -e "SHOW CREATE TABLE members\G"'
```

# Symbion

A points programme shared by many merchants. Members earn points at any partner merchant and redeem them for vouchers; the app settles the point value with each merchant through a monthly reconciliation report.

Merchants send orders, refunds and code confirmations with an API key. Members use the web app. The admin runs the programme from `/admin`.

## Quick start

Requires Docker.

```bash
cp infra/.env.example infra/.env   # replace every change-me
docker compose -f infra/compose.yaml up --build
```

API on http://localhost:3000, Swagger UI on http://localhost:3000/docs. Without `--profile prod` Compose starts `mysql` and `api` only.

Local run: Node.js 26+, pnpm 12, `infra/.env` as above.

```bash
pnpm install
pnpm build:ledger   # the api imports packages/ledger/dist
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev       # API on http://localhost:3000
pnpm dev:web   # web on http://localhost:5173
```

Details and environment variables: [Development](docs/development.md).

## Demo

https://symbion-demo.duckdns.org

- Member app: sign in with `member1@demo.example` to `member10@demo.example` ([what each member shows](docs/deploy.md#demo-data)). The sign-in code appears on the page; no email is sent.
- Admin: https://symbion-demo.duckdns.org/admin. Press "Use the demo account" to sign in. The merchant keys are at https://symbion-demo.duckdns.org/api/demo/accounts.
- Merchant (point of sale): https://symbion-demo.duckdns.org/admin/counter sends orders, refunds, redemptions and code confirmations with a merchant key from the same accounts page, as a real POS would.
- Swagger UI: https://symbion-demo.duckdns.org/api/docs

The data resets every night at 04:00 (Asia/Ho_Chi_Minh), including the point value.

## Try it

Against a local api seeded with `DEMO_API_KEY=demo-key-demo-key-1234 pnpm seed:demo` (see [Development](docs/development.md)). `member7@demo.example` starts with 487 points; voucher 9 costs 240.

Duplicate order: the same `Idempotency-Key` returns the first order (201, then 200); a different amount is rejected (422).

```bash
K=demo-key-demo-key-1234; U=localhost:3000
for a in 250000 250000 5; do
  curl -s -w ' [%{http_code}]\n' -X POST $U/orders -H 'content-type: application/json' \
    -H "x-api-key: $K" -H 'Idempotency-Key: try-1' -d "{\"memberEmail\":\"member7@demo.example\",\"amount\":$a}"
done
```

Parallel redemption: 10 simultaneous requests; the balance covers two (201), the rest are refused (409), and the balance never goes below zero.

```bash
seq 1 10 | xargs -P 10 -I{} curl -s -o /dev/null -w '%{http_code}\n' -X POST $U/redemptions \
  -H 'content-type: application/json' -H "x-api-key: $K" -H "Idempotency-Key: par-{}" \
  -d '{"memberEmail":"member7@demo.example","voucherId":9}' | sort | uniq -c
```

More requests: [Testing](docs/testing.md).

## Surfaces

| Surface       | Address                                                               | Access                     |
| ------------- | --------------------------------------------------------------------- | -------------------------- |
| Member app    | `/` (home), `/me` (personal page)                                     | email and one-time code    |
| Admin console | `/admin`: statement, merchants, programme, vouchers, members, counter | `ADMIN_EMAIL` and password |
| Merchant API  | orders, refunds, redemption confirmation, members                     | `x-api-key` header         |
| Swagger UI    | `/docs` on the API, `/api/docs` behind nginx                          | none                       |

## Layout

```text
apps/
  api/      NestJS HTTP API
  web/      React + Vite + Tailwind (admin and member pages)
packages/
  ledger/   append-only point ledger (internal package)
infra/      Docker Compose, nginx
docs/       programme rules, development, deploy, testing, API and database reference
```

## Known limitations

- One api instance: the scheduled jobs (tier downgrade, demo reset) run inside the api process with no lock across instances.
- Changing the point value changes the VND of closed months for the issued and refunded reconciliation lines.
- The reconciliation report is computed on request; a month is not closed or stored.
- Members are created by a merchant through the API or sign up themselves on the sign-in form: a new email gets a code, then the form asks for a display name and creates the member. Codes are emailed only when `SMTP_HOST` is set; otherwise the code is returned in the response with `DEMO_MODE=true`.
- Merchants authenticate with an API key only; there is no merchant login or portal.
- No webhook intake or dead-letter handling.
- No automated backups; the data lives in the `mysql-data` Docker volume.

## Docs

- [Programme rules](docs/rules.md)
- [Development](docs/development.md)
- [Deploy](docs/deploy.md)
- [Manual testing](docs/testing.md)
- [API conventions](docs/schema/api.md)
- [Database schema](docs/schema/database.md)

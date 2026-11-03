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
- Swagger UI: https://symbion-demo.duckdns.org/api/docs

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
- Members are created by a merchant through the API or sign up themselves on the sign-in form: a new email is asked for a name, gets a code, and the right code creates the member. Codes are emailed only when `SMTP_HOST` is set; otherwise the code is returned in the response with `DEMO_MODE=true`.
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

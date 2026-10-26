# Symbion

A points programme shared by many merchants. Members earn points at any partner merchant and redeem them for vouchers; the app settles the point value with each merchant through a monthly reconciliation report.

## Requirements

- Node.js 26+
- pnpm 12 (`npm install -g pnpm`)

## Commands

```bash
pnpm install
pnpm build       # all workspaces
pnpm typecheck   # all workspaces
pnpm test        # all workspaces

pnpm --filter @symbion/api start:dev   # API on http://localhost:3000
# Swagger UI on http://localhost:3000/docs while the API runs
pnpm --filter @symbion/web dev         # web on http://localhost:5173
```

## Layout

```text
apps/
  api/      NestJS HTTP API
  web/      React + Vite + Tailwind (admin and member pages)
packages/
  ledger/   append-only point ledger (internal package)
```

## CI and Docker

GitHub Actions (`.github/workflows/ci.yml`) runs lint, format check, typecheck, tests and build on every PR and on pushes to `dev` and `master`. Run the same checks locally with `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm build`.

Build and run the API image from the repo root:

```bash
docker build -f apps/api/Dockerfile -t symbion-api .
docker run --rm -p 3000:3000 symbion-api
```

## Docker Compose

`infra/compose.yaml` runs the API and MySQL 8.4. The API starts after MySQL reports healthy, and Compose marks the API healthy once `GET /health` answers 200 (it also checks MySQL).

```bash
cp infra/.env.example infra/.env   # then replace every change-me with your own password
docker compose -f infra/compose.yaml up --build
```

The API is on http://localhost:3000 and MySQL on `localhost:3306` (override with `API_PORT` and `DB_PORT` in `infra/.env`). Data lives in the `mysql-data` volume; `docker compose -f infra/compose.yaml down -v` removes it.

## Database connection

The API connects to MySQL through TypeORM with SQL logging on and `synchronize` off; schema changes are hand-written SQL. It reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` and `DB_PASSWORD` and refuses to start if one is missing. The e2e tests need a running MySQL: start one with `pnpm db:up`, then export the same variables (see `infra/.env.example`, with `DB_HOST=127.0.0.1`).

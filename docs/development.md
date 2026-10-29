# Development

## Requirements

- Node.js 26+
- pnpm 12 (`npm install -g pnpm`)
- Docker (MySQL for the e2e tests)

## Commands

```bash
pnpm install
pnpm build:ledger # api imports packages/ledger/dist; build it before typecheck, test or lint
pnpm build        # all workspaces
pnpm typecheck    # all workspaces
pnpm test         # all workspaces
pnpm check        # everything CI runs

pnpm --filter @symbion/api start:dev   # API on http://localhost:3000
# Swagger UI on http://localhost:3000/docs while the API runs
pnpm --filter @symbion/web dev         # web on http://localhost:5173
```

## CI

`.github/workflows/ci.yml`, on pull requests and pushes to `dev` and `master`. Local equivalent: `pnpm check`.

## Database

TypeORM on MySQL 8.4. `synchronize` off. Schema changes: hand-written SQL migrations only.

Required variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`. Startup fails if one is missing. Example values: `infra/.env.example`.

E2E tests require a running MySQL: `pnpm db:up`, then export the variables with `DB_HOST=127.0.0.1`. See `testing.md`.

## Docker Compose

`infra/compose.yaml` runs the API and MySQL 8.4. The API starts after MySQL is healthy; its healthcheck is `GET /health` (200, includes a MySQL check).

```bash
cp infra/.env.example infra/.env   # replace every change-me
docker compose -f infra/compose.yaml up --build
```

Ports default to 3000 (API) and 3306 (MySQL); override with `API_PORT` and `DB_PORT` in `infra/.env`. Data volume: `mysql-data` (`docker compose -f infra/compose.yaml down -v` removes it).

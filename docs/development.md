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

## Web

`apps/web`: React, Vite, Tailwind, shadcn/ui, TanStack Query, react-hook-form with zod, react-i18next.

- The dev server proxies `/api/*` to `http://localhost:3000/*` (`vite.config.ts`); `API_PROXY_TARGET` sets another target. The API must be running. Production serves the build behind nginx under the same `/api/` prefix, so the API needs no CORS.
- Member sign-in needs an existing member and `DEMO_MODE=true` on the API: the code comes back in the response and is shown on the page. Email is sent only when `SMTP_HOST` is set (see `docs/deploy.md`).
- Admin console at `/admin`: sign-in with `ADMIN_EMAIL` and the password behind `ADMIN_PASSWORD_HASH`. Signed out, every `/admin/*` address shows the sign-in.
- Admin pages: `/admin` (monthly statement, CSV download), `/admin/merchants`, `/admin/programme` (point value, tiers), `/admin/vouchers`, `/admin/members`, `/admin/counter` (calls the merchant API with a merchant key).
- `localStorage` keys: `token` (member access token), `adminToken` (admin access token), `lang` (`vi` default, or `en`), `theme` (`light` or `dark`; the system setting when unset).
- `sessionStorage` key: `symbion.counter.keys` (merchant API keys typed on the counter page, per merchant, this tab only).
- Copy lives in `src/i18n/en.json` and `src/i18n/vi.json`; add a key to both.
- `src/components/ui` is shadcn output (`npx shadcn@latest add <name>`) with local changes to `button`, `input` and `input-otp` (44px touch targets on a phone, field fill, separate code boxes). Re-adding with `--overwrite` replaces them.

## CI

`.github/workflows/ci.yml`, on pull requests and pushes to `dev` and `master`. Local equivalent: `pnpm check`.

## Database

TypeORM on MySQL 8.4. `synchronize` off. Schema changes: hand-written SQL migrations only.

Required variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET` (at least 32 characters). Startup fails if one is missing. Optional: `MAX_POINTS_PER_ORDER` (default 10000), `JWT_EXPIRES_IN` (default `1h`), `DEMO_MODE` (`true` returns member login codes in the response), `TIER_DOWNGRADE_CRON` (when the nightly tier job runs, default `0 3 * * *` in Asia/Ho_Chi_Minh; seconds are allowed, for example `*/5 * * * * *` to watch it run), `POINT_EXPIRY_CRON` (nightly point expiry, default `0 2 * * *`), `DEMO_RESET` (`true` wipes and reseeds the demo data every night, needs `DEMO_MODE=true` and a `DEMO_API_KEY` of 16+ characters, see `docs/deploy.md`), `DEMO_RESET_CRON` (default `0 4 * * *` in Asia/Ho_Chi_Minh). Example values: `infra/.env.example`.

`start`, `start:dev`, `test`, `seed` and the migration scripts of `apps/api` load `infra/.env`; variables already set in the shell take precedence. `start:prod` does not load it.

E2E tests require a running MySQL (`pnpm db:up`). See `testing.md`.

## Docker Compose

`infra/compose.yaml` runs the API and MySQL 8.4. The API starts after MySQL is healthy; its healthcheck is `GET /health` (200, includes a MySQL check).

```bash
cp infra/.env.example infra/.env   # replace every change-me
docker compose -f infra/compose.yaml up --build
```

Ports default to 3000 (API) and 3306 (MySQL); override with `API_PORT` and `DB_PORT` in `infra/.env`. Data volume: `mysql-data` (`docker compose -f infra/compose.yaml down -v` removes it).

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

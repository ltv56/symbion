# Symbion

A points programme shared by many merchants. Members earn points at any partner merchant and redeem them for vouchers; the app settles the point value with each merchant through a monthly reconciliation report.

## Quick start

Requires Docker.

```bash
cp infra/.env.example infra/.env   # replace every change-me
docker compose -f infra/compose.yaml up --build
```

API on http://localhost:3000, Swagger UI on http://localhost:3000/docs.

## Layout

```text
apps/
  api/      NestJS HTTP API
  web/      React + Vite + Tailwind (admin and member pages)
packages/
  ledger/   append-only point ledger (internal package)
infra/      Docker Compose
docs/       development, testing, API and database reference
```

## Docs

- [Programme rules](docs/rules.md)
- [Development](docs/development.md)
- [Manual testing](docs/testing.md)
- [API conventions](docs/schema/api.md)
- [Database schema](docs/schema/database.md)

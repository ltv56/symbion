# Deploy

Single host, Docker Compose with `nginx`, `api` and `mysql`. Nginx terminates TLS, serves the web build and proxies `/api/` to the api.

## Requirements

- A Linux host with Docker and the Compose plugin.
- A DNS record pointing the domain at the host.
- Inbound ports 80 and 443 only. `mysql` and `api` are published on `127.0.0.1` and must not be opened.
- `infra/.env` (see `infra/.env.example`) with strong values for `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `ADMIN_PASSWORD_HASH` and `JWT_SECRET`.

## Environment

| Variable               | Used by | Notes                                                                           |
| ---------------------- | ------- | ------------------------------------------------------------------------------- |
| `DOMAIN`               | nginx   | public host name; selects `/etc/letsencrypt/live/$DOMAIN/`                      |
| `DB_*`                 | api     | see `infra/.env.example`                                                        |
| `ADMIN_EMAIL`          | api     | admin login                                                                     |
| `ADMIN_PASSWORD_HASH`  | api     | `printf '%s' '<password>' \| pnpm --silent --filter @symbion/api hash-password` |
| `JWT_SECRET`           | api     | random, at least 32 characters, e.g. `openssl rand -base64 48`                  |
| `JWT_EXPIRES_IN`       | api     | optional, default `1h`                                                          |
| `MAX_POINTS_PER_ORDER` | api     | optional, default `10000`                                                       |

## First deploy

```sh
# 1. certificate (stop anything on port 80 first)
sudo certbot certonly --standalone -d "$DOMAIN"

# 2. database and migrations
docker compose -f infra/compose.yaml up -d --wait mysql
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed

# 3. everything else
DOMAIN=example.com docker compose -f infra/compose.yaml --profile prod up -d --build
```

Without `--profile prod` Compose starts only `mysql` and `api` (development).

## Certificate renewal

The standalone challenge needs port 80, so nginx is stopped around each renewal:

```sh
sudo certbot renew \
  --pre-hook "docker compose -f $PWD/infra/compose.yaml --profile prod stop nginx" \
  --post-hook "docker compose -f $PWD/infra/compose.yaml --profile prod start nginx"
```

Run it from cron or a systemd timer twice a day; certbot renews only certificates close to expiry. Nginx also serves `/.well-known/acme-challenge/` from `/var/www/certbot` on port 80 for webroot-based renewal.

## Nginx

- `/api/` is proxied with the prefix removed; `X-Request-Id` is set from nginx's request id.
- Rate limit on `/api/`: 10 requests per second per client IP, burst 20, over the limit `429`.
- Request bodies are limited to 1 MB (`413`).
- Port 80 redirects to HTTPS except for the ACME challenge path.
- Config: `infra/nginx/nginx.conf.template`; image: `infra/nginx/Dockerfile` (builds `apps/web`).

Check a config change without starting the stack:

```sh
docker build -f infra/nginx/Dockerfile -t symbion-nginx .
docker run --rm -e DOMAIN=example.com -v /etc/letsencrypt:/etc/letsencrypt:ro --add-host api:127.0.0.1 symbion-nginx nginx -t
```

## Demo data

```sh
DEMO_API_KEY=<16+ characters> pnpm seed:demo
```

Creates the tiers, the merchant "Demo Shop" with that API key and three members. Safe to run twice. With `NODE_ENV=production` the script refuses to run unless `--allow-production` is passed.

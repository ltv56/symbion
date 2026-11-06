# Deploy

Single host, Docker Compose with `nginx`, `api` and `mysql`. Nginx terminates TLS, serves the web build and proxies `/api/` to the api.

## Requirements

- A Linux host with Docker and the Compose plugin. Recommended: 2 GB RAM, 20 GB disk.
- A DNS record pointing the domain at the host.
- Inbound ports 80 and 443 only, plus SSH from your own address. `mysql` and `api` are published on `127.0.0.1` and must not be opened.
- `infra/.env` (see `infra/.env.example`) with `DOMAIN` and strong values for `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `ADMIN_PASSWORD_HASH` and `JWT_SECRET`.
- `ADMIN_PASSWORD_HASH` in single quotes: the value contains `$`, which Compose expands in unquoted and double-quoted values. The api refuses to start with a hash cut that way.

## Environment

| Variable               | Used by | Notes                                                                                                                        |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `DOMAIN`               | nginx   | public host name; selects `/etc/letsencrypt/live/$DOMAIN/`                                                                   |
| `DB_*`                 | api     | see `infra/.env.example`                                                                                                     |
| `ADMIN_EMAIL`          | api     | admin login                                                                                                                  |
| `ADMIN_PASSWORD_HASH`  | api     | `printf '%s' '<password>' \| pnpm --silent --filter @symbion/api hash-password`                                              |
| `DEMO_MODE`            | api     | optional, `true` returns the member login code and serves `GET /demo/members`                                                |
| `SMTP_HOST`            | api     | optional; without it no email is sent (sign-in codes only reach `DEMO_MODE` responses)                                       |
| `SMTP_PORT`            | api     | optional, default `587`; `465` uses TLS                                                                                      |
| `SMTP_USER`            | api     | optional; with it `SMTP_PASSWORD` is required                                                                                |
| `SMTP_PASSWORD`        | api     | SMTP password or key                                                                                                         |
| `SMTP_FROM`            | api     | required with `SMTP_HOST`, e.g. `Symbion <noreply@example.com>`; some providers only accept a verified sender                |
| `JWT_SECRET`           | api     | random, at least 32 characters, e.g. `openssl rand -base64 48`                                                               |
| `JWT_EXPIRES_IN`       | api     | optional, default `1h`                                                                                                       |
| `MAX_POINTS_PER_ORDER` | api     | optional, default `10000`                                                                                                    |
| `DEMO_RESET`           | api     | optional, `true` resets the demo data every night (see Demo data)                                                            |
| `DEMO_API_KEY`         | api     | at least 16 characters; required when `DEMO_RESET=true`                                                                      |
| `DEMO_ADMIN_PASSWORD`  | api     | optional, the plaintext behind `ADMIN_PASSWORD_HASH`; `GET /demo/accounts` shows it (the api refuses to start on a mismatch) |
| `TIER_DOWNGRADE_CRON`  | api     | optional, cron in Asia/Ho_Chi_Minh, default `0 3 * * *`                                                                      |
| `POINT_EXPIRY_CRON`    | api     | optional, cron in Asia/Ho_Chi_Minh, default `0 2 * * *`                                                                      |
| `DEMO_RESET_CRON`      | api     | optional, cron in Asia/Ho_Chi_Minh, default `0 4 * * *`                                                                      |

## First deploy

From the repository root, with `infra/.env` filled in. Only Docker is needed on the host.

```sh
# 1. certificate (stop anything on port 80 first)
sudo certbot certonly --standalone -d <DOMAIN>

# 2. images
docker compose -f infra/compose.yaml --profile prod build

# 3. database, migrations, tiers
docker compose -f infra/compose.yaml up -d --wait mysql
docker compose -f infra/compose.yaml run --rm api node node_modules/typeorm/cli.js -d dist/data-source.js migration:run
docker compose -f infra/compose.yaml run --rm api node dist/seed.js

# 4. start
docker compose -f infra/compose.yaml --profile prod up -d
```

Without `--profile prod` Compose starts only `mysql` and `api` (development). A demo host seeds with `seed-demo` instead of `seed` (see Demo data).

## Update

```sh
git pull
docker compose -f infra/compose.yaml --profile prod build
docker compose -f infra/compose.yaml run --rm api node node_modules/typeorm/cli.js -d dist/data-source.js migration:run
docker compose -f infra/compose.yaml --profile prod up -d
docker compose -f infra/compose.yaml --profile prod restart nginx
```

Do not run the update while certbot renews (see Certificate renewal): the restart would take port 80 from its standalone challenge. Nginx resolves `api` once, when it starts. A recreated `api` container gets a new address, so without the restart `/api/` answers `502 Bad Gateway`.

## Admin password

Generate the hash on the host with the api image, so the host needs no Node.js. Use ASCII characters only. The password is read from stdin, so it stays out of the shell history and the process arguments.

```sh
read -rs PASSWORD && printf '%s' "$PASSWORD" | docker compose -f infra/compose.yaml run --rm -T --no-deps api node dist/hash-password.js; unset PASSWORD
```

Put the output in `infra/.env` as `ADMIN_PASSWORD_HASH='<hash>'` (single quotes, see Requirements), then recreate the api and restart nginx as in Update. Signed-in admin sessions stay valid until the token expires (`JWT_EXPIRES_IN`); change `JWT_SECRET` as well to end them; that also signs every member out and voids the login codes not used yet. With `DEMO_ADMIN_PASSWORD` set, change it to the same new password or the api does not start.

## Restart and logs

All services use `restart: unless-stopped`. Container logs rotate: 3 files of 10 MB per service. Read them with `docker compose -f infra/compose.yaml logs api`.

## Backup

```sh
docker compose -f infra/compose.yaml exec -T mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" --single-transaction "$MYSQL_DATABASE"' > backup.sql
```

Restore:

```sh
docker compose -f infra/compose.yaml exec -T mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < backup.sql
```

Nothing runs the backup automatically; copy `backup.sql` off the host.

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
- Responses carry `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` and `Referrer-Policy: strict-origin-when-cross-origin`, next to HSTS.
- Swagger UI is public at `/api/docs`.
- Port 80 redirects to HTTPS except for the ACME challenge path.
- Config: `infra/nginx/nginx.conf.template`; image: `infra/nginx/Dockerfile` (builds `apps/web`).

Check a config change without starting the stack:

```sh
docker build -f infra/nginx/Dockerfile -t symbion-nginx .
docker run --rm -e DOMAIN=example.com -v /etc/letsencrypt:/etc/letsencrypt:ro --add-host api:127.0.0.1 symbion-nginx nginx -t
```

## Demo data

A public demo shows its accounts: set `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` and `DEMO_ADMIN_PASSWORD` to a throwaway admin login (for example `admin@demo.example`) that is used nowhere else, with `DEMO_MODE=true` and `DEMO_API_KEY`. `GET /demo/accounts` then returns the admin login and the six merchant keys. The nightly reset puts the point value back to 100; it does not undo a change of `ADMIN_*`.

```sh
# development
DEMO_API_KEY=<16+ characters> pnpm seed:demo

# deployed, with DEMO_API_KEY in infra/.env
docker compose -f infra/compose.yaml run --rm api node dist/seed-demo.js --allow-production
```

Creates the tiers, six merchants, 15 vouchers (description and steps in Vietnamese), ten members and 94 events (78 orders, 9 redemptions of which 7 confirmed, 7 refunds) dated back 13 months (Asia/Ho_Chi_Minh). The first merchant, "Tạp Hoá Cây Me", uses `<DEMO_API_KEY>`; the others use `<DEMO_API_KEY>-cafe`, `-bakery`, `-book`, `-pho`, `-tea`. Merchants get a Vietnamese address and no photo; set one with `PATCH /merchants/:id`. `GET /reconciliation` has numbers for each of the last five months. Vouchers: one sold out, one with 2 left, one ending in 9 days, one stopped.

| Member | Tier   | Shows                                                      |
| ------ | ------ | ---------------------------------------------------------- |
| 1      | Bronze | small history, one refund                                  |
| 2      | Silver | points that expire in about two weeks                      |
| 3      | Gold   | 57 history rows (a second page), a valid code, 3 favorites |
| 4      | Bronze | negative balance: refund after the points were spent       |
| 5      | Bronze | a voucher code that expired unused                         |
| 6      | Bronze | points that already expired                                |
| 7      | Silver | 97% of the Gold threshold                                  |
| 8      | Silver | qualifying orders about to leave the 12-month window       |
| 9      | Bronze | no events                                                  |
| 10     | Gold   | three partial refunds of one order                         |

Safe to run twice; the events are keyed by the month they fall in, so a run in a later month adds that month's events. With `NODE_ENV=production` the script refuses to run unless `--allow-production` is passed. With `DEMO_RESET=true` the first reset happens at the next 04:00; run the seed once after the first deploy so the demo is not empty until then.

### Nightly reset

`DEMO_RESET=true` deletes every row except `migrations` at 04:00 Asia/Ho_Chi_Minh, sets the point value back to 100 and seeds the demo data again, as `pnpm seed:demo` does with `DEMO_API_KEY`. `DEMO_RESET_CRON` changes the time (cron expression, seconds allowed). Rows get new ids.

The api refuses to start with `DEMO_RESET=true` unless `DEMO_MODE=true` and a `DEMO_API_KEY` of at least 16 characters are set. A failed night is logged and the next one runs; a reset that fails after the delete leaves the demo empty until then. Run it only on a demo host: it deletes all data.

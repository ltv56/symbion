# API conventions

## Errors

All error responses use this JSON body:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": ["email must be an email"]
}
```

| Field        | Notes                                                             |
| ------------ | ----------------------------------------------------------------- |
| `statusCode` | HTTP status code, same as the response status                     |
| `error`      | Status name, e.g. `Unauthorized`, `Not Found`, `Conflict`         |
| `message`    | Always a string                                                   |
| `details`    | Only on 400 validation errors: one string per violated constraint |

Unexpected errors: 500, `"message": "Internal server error"`. The cause (SQL, stack trace) is logged server-side only.

Logs of failed requests contain method, path and status only; no request bodies or headers.

With `NODE_ENV=production` the SQL log (`RedactedSqlLogger`) prints the query text only: no parameters (member emails) and no MySQL error message (contains the duplicate value). Failed queries log the MySQL `code` and `errno`. Other environments log in full.

Implemented by `AllExceptionsFilter` in `apps/api/src/common/all-exceptions.filter.ts`.

## Authentication

- `POST /members` and `POST /orders` require the `x-api-key` header of a merchant.
- `GET /members*` is unauthenticated until member auth is added.
- `/merchants*`, `POST /tiers` and `POST /vouchers` require `Authorization: Bearer <token>` from `POST /auth/login` (admin only).
- `GET /tiers*` and `GET /vouchers*` are public.
- `GET /health` is unauthenticated (load balancers and Compose probes cannot send a key).

## POST /auth/login

Logs in the admin account configured in the environment. Body: `email`, `password` (1-200 characters). Responses: `200` with `{ "accessToken": "<jwt>" }`, `400` validation, `401` `Invalid credentials` (same body for a wrong email and a wrong password).

The token is a JWT (HS256) with payload `{ "sub": "admin", "role": "admin" }` that expires after `JWT_EXPIRES_IN`. Admin endpoints answer `401` for a missing, malformed, expired or wrongly signed token, and for a token without `role: admin`.

| Variable              | Notes                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `ADMIN_EMAIL`         | required; compared case-insensitively                                                    |
| `ADMIN_PASSWORD_HASH` | required; `scrypt$<salt hex>$<hash hex>`, create with `pnpm hash-password` (see testing) |
| `JWT_SECRET`          | required, at least 32 characters                                                         |
| `JWT_EXPIRES_IN`      | optional, default `1h`                                                                   |

The api does not start when a required variable is missing or `JWT_SECRET` is too short.

Known limitations: no refresh token, no logout, no rate limit on login, a single admin account.

## Request id and logs

- Every response has an `x-request-id` header: the client's value (1-64 chars of `A-Z a-z 0-9 . _ -`) or a generated UUID.
- One access log line per request: `METHOD /path status Nms` (no query string, no headers). Every log line of the request carries the same id.
- `NODE_ENV=production`: one JSON object per line (`time`, `level`, `context`, `message`, `requestId`, `stack` for errors). Otherwise Nest's console format.

## GET /health

Liveness plus a MySQL check (`SELECT 1`). Responses: `200` with `{ "status": "ok" }`, `503` in the common error shape (`"message": "Database unavailable"`) when MySQL does not answer. The cause is logged server-side only.

## GET /tiers, GET /tiers/:id

Public. `GET /tiers` lists tiers by `min_points` ascending; `GET /tiers/:id` returns `404` for an unknown id and `400` when the id is not an integer. A tier is `{ "id", "name", "minPoints", "earnRate" }`; `earnRate` is a number.

## POST /tiers

Admin only. Body:

| Field       | Rule                                           |
| ----------- | ---------------------------------------------- |
| `name`      | string, trimmed, 1-255 characters, unique      |
| `minPoints` | integer from 0 to 4294967295, unique           |
| `earnRate`  | number from 0.01 to 999.99, at most 2 decimals |

Responses: `201` with the tier, `400` validation (unknown fields included), `401` no or invalid admin token, `409` name or `min_points` already used. There is no update or delete.

## POST /members

Creates a member on the lowest tier (smallest `min_points`). Responses: `201`, `400` validation, `401` bad key, `409` email already registered, `503` (`"message": "No tiers configured"`) when the `tiers` table is empty.

## POST /orders

A merchant reports an order for a member. `merchant_id` comes from the API key, never from the body.

| Input             | Notes                                                                            |
| ----------------- | -------------------------------------------------------------------------------- |
| `x-api-key`       | header, required                                                                 |
| `Idempotency-Key` | header, required, 1-255 characters; unique per merchant                          |
| `memberEmail`     | body, email of an existing member                                                |
| `amount`          | body, integer VND from 1 to 9999999999; what the member paid (after any voucher) |

A new order awards points to the member in the same transaction (see `docs/rules.md`). The response body is the order; points are not included.

Responses: `201` with the created order (`amount` is a number), `200` with the original order when the same `Idempotency-Key` was already used by this merchant with the same `memberEmail` and `amount` (no second order, no extra points), `400` invalid input (amount not an integer or outside 1 to 9999999999) or missing `Idempotency-Key`, `401` missing or unknown API key, `404` unknown member, `422` the `Idempotency-Key` was already used for another member or `amount` (`"message": "Idempotency-Key was already used with a different request"`). `memberEmail` is compared after it resolves to a member, so emails that match the same member are equal; an unknown member returns `404` before the key is checked.

## POST /vouchers

Admin only. Creates a voucher on behalf of a merchant. Body:

| Field         | Rule                                            |
| ------------- | ----------------------------------------------- |
| `merchantId`  | integer, an existing merchant                   |
| `title`       | string, trimmed, 1-255 characters               |
| `faceValue`   | integer VND from 1 to 9007199254740991          |
| `pointsPrice` | integer from 1 to 9007199254740991              |
| `stock`       | integer from 0 to 4294967295                    |
| `validUntil`  | ISO 8601 date-time in the future, whole seconds |

`faceValue` must be at least `pointsPrice × point value` (`program_settings.point_value_vnd`).

A voucher is `{ "id", "merchantId", "title", "faceValue", "pointsPrice", "stock", "validUntil", "status", "createdAt" }`; `status` is `active`.

Responses: `201` with the voucher, `400` validation (unknown fields included) or `faceValue` below the floor (`"message": "faceValue 49999 is below the floor 50000 (500 points x 100 VND)"`), `401` no or invalid admin token, `404` unknown merchant.

## GET /vouchers, GET /vouchers/:id

Public. Only vouchers with `status` `active` and `validUntil` in the future.

`GET /vouchers` lists by `id` descending (keyset pagination). Query:

| Field   | Rule                                                  |
| ------- | ----------------------------------------------------- |
| `limit` | integer from 1 to 100, default 20                     |
| `after` | integer from 1; the `nextCursor` of the previous page |

Response: `200` with `{ "items": [<voucher>], "nextCursor": <id | null> }`; `nextCursor` is `null` on the last page. `400` for an invalid or unknown query field.

`GET /vouchers/:id`: `200` with the voucher, `404` (`"message": "Voucher with id 1 not found"`) when unknown, `expired` or past `validUntil`, `400` when the id is not an integer.

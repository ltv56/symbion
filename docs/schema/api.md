# API conventions

## Errors

Every error response, whatever its cause, has this JSON body:

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

Unexpected errors return 500 with `"message": "Internal server error"`; the cause (SQL, stack trace) is logged server-side, never returned.

Logs record the method, path and status of failed requests only, never request bodies or headers, so API keys do not reach the logs.

With `NODE_ENV=production` the SQL log (`RedactedSqlLogger`) prints the query text only: no parameters (member emails) and no MySQL error message (it repeats the duplicate value). Failed queries log the MySQL `code` and `errno`. Other environments keep TypeORM's full log.

Implemented by `AllExceptionsFilter` in `apps/api/src/common/all-exceptions.filter.ts`.

## Authentication

- `POST /members` and `POST /orders` require the `x-api-key` header of a merchant.
- `GET /members*` is unauthenticated until member auth is added.
- `POST /merchants` is unauthenticated until admin auth is added.
- `GET /health` is unauthenticated (load balancers and Compose probes cannot send a key).

## Request id and logs

Every response carries an `x-request-id` header. If the client sends one (1-64 chars of `A-Z a-z 0-9 . _ -`) it is echoed, otherwise the api generates a UUID. Each request logs one access line (`METHOD /path status Nms`, no query string, no headers), and every log line written during the request carries the same id. With `NODE_ENV=production` logs are one JSON object per line (`time`, `level`, `context`, `message`, `requestId`, `stack` for errors); in dev and test they stay in Nest's console format.

## GET /health

Liveness plus a MySQL check (`SELECT 1`). Responses: `200` with `{ "status": "ok" }`, `503` in the common error shape (`"message": "Database unavailable"`) when MySQL does not answer. The cause is logged server-side only.

## POST /orders

A merchant reports an order for a member. `merchant_id` comes from the API key, never from the body.

| Input             | Notes                                                           |
| ----------------- | --------------------------------------------------------------- |
| `x-api-key`       | header, required                                                |
| `Idempotency-Key` | header, required, 1-255 characters; unique per merchant         |
| `memberEmail`     | body, email of an existing member                               |
| `amount`          | body, number from 0.01 to 9999999999.99 with at most 2 decimals |

Responses: `201` with the created order (`amount` is a string such as `"99.90"`), `200` with the original order when the same `Idempotency-Key` was already used by this merchant (no second order is created), `400` invalid input (amount outside 0.01 to 9999999999.99, more than 2 decimals) or missing `Idempotency-Key`, `401` missing or unknown API key, `404` unknown member.

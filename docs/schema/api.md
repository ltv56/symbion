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

Implemented by `AllExceptionsFilter` in `apps/api/src/common/all-exceptions.filter.ts`.

## Authentication

- `POST /members` requires the `x-api-key` header of a merchant.
- `GET /members*` is unauthenticated until member auth is added.
- `POST /merchants` is unauthenticated until admin auth is added.

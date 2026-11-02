import { QueryFailedError } from 'typeorm';

// MySQL unique violation; with `constraint`, only a violation of that unique key.
export function isDuplicateEntry(error: unknown, constraint?: string): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError = error.driverError as {
    code?: string;
    sqlMessage?: string;
  };
  if (driverError.code !== 'ER_DUP_ENTRY') return false;
  return constraint === undefined
    ? true
    : (driverError.sqlMessage?.includes(constraint) ?? false);
}

import { getToken, signOut } from './auth';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export async function api<T>(
  path: string,
  { method = 'GET', body }: RequestOptions = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    // 401 without a token: wrong code; with one: expired session
    if (res.status === 401 && token) signOut();
    const error: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new ApiError(res.status, error?.message ?? res.statusText);
  }
  return (await res.json()) as T;
}

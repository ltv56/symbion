import { adminSignOut, getAdminToken } from './adminAuth';
import { getToken, signOut } from './auth';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  // The admin session instead of the member one
  as?: 'admin';
}

export async function api<T>(
  path: string,
  { method = 'GET', body, as }: RequestOptions = {},
): Promise<T> {
  const token = as === 'admin' ? getAdminToken() : getToken();
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
    // Only if no other tab replaced the token meanwhile
    const current = as === 'admin' ? getAdminToken() : getToken();
    if (res.status === 401 && token && current === token) {
      if (as === 'admin') adminSignOut();
      else signOut();
    }
    const error: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new ApiError(res.status, error?.message ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

import { ApiError } from '@/lib/api';
import { getToken, signOut } from '@/lib/auth';

export interface Redemption {
  id: number;
  code: string;
  points: number;
  status: 'issued' | 'used' | 'expired';
  expiresAt: string;
}

// Like api(), with the status and the Idempotency-Key header
export async function postRedemption(
  voucherId: number,
  key: string,
): Promise<{ status: number; data: Redemption }> {
  const token = getToken();
  const res = await fetch('/api/me/redemptions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ voucherId }),
  });

  if (!res.ok) {
    if (res.status === 401 && token) signOut();
    const error: { message?: string } | null = await res
      .json()
      .catch(() => null);
    throw new ApiError(res.status, error?.message ?? res.statusText);
  }
  return { status: res.status, data: (await res.json()) as Redemption };
}

import { createHash } from 'node:crypto';

// The idempotency key is not part of the hash: same key + another hash = key reused for another request.
export function orderRequestHash(memberEmail: string, amount: number): string {
  const canonical = JSON.stringify({
    memberEmail: memberEmail.toLowerCase(),
    amount,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

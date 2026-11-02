export interface TapeEntry {
  id: number;
  at: number;
  path: string;
  status: number;
  ms: number;
  keyTail: string;
  idempotencyKey: string | null;
  request: unknown;
  response: unknown;
}

let nextId = 1;

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Calls as a merchant's till does: the key in a header, any status is an answer
export async function callMerchantApi({
  path,
  apiKey,
  idempotencyKey,
  body,
}: {
  path: string;
  apiKey: string;
  idempotencyKey: string | null;
  body?: Record<string, unknown>;
}): Promise<TapeEntry> {
  const started = performance.now();
  let status = 0;
  let response: unknown;
  try {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    status = res.status;
    const text = await res.text();
    response = text ? parse(text) : null;
  } catch (error) {
    response = { message: error instanceof Error ? error.message : 'Network' };
  }
  return {
    id: nextId++,
    at: Date.now(),
    path,
    status,
    ms: Math.round(performance.now() - started),
    keyTail: apiKey.slice(-4),
    idempotencyKey,
    request: body ?? null,
    response,
  };
}

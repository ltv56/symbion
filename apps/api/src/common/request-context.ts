import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  requestId: string;
}

// Carries the request id to any log line written while the request is handled.
export const requestContext = new AsyncLocalStorage<RequestContext>();

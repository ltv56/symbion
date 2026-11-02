import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from './request-context';

// Client ids go into logs and a response header, so only accept a short safe charset.
const SAFE_ID = /^[A-Za-z0-9._-]{1,64}$/;
const logger = new Logger('HTTP');

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header('x-request-id');
  const requestId =
    incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('x-request-id', requestId);

  const startedAt = Date.now();
  // Path only, no query string or headers: they can carry credentials.
  res.on('finish', () => {
    logger.log(
      `${req.method} ${req.path} ${res.statusCode} ${Date.now() - startedAt}ms`,
    );
  });

  requestContext.run({ requestId }, next);
}

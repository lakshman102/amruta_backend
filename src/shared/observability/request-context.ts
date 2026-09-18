import { randomBytes } from 'node:crypto';
import type { RequestHandler } from 'express';

function randomHex(bytes: number): string {
  return randomBytes(bytes).toString('hex');
}

function validTraceparent(value: string | undefined): boolean {
  return !!value && /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/.test(value);
}

export function createRequestContextMiddleware(): RequestHandler {
  return (req, res, next) => {
    const incomingRequestId = req.header('x-request-id');
    const requestId = incomingRequestId && incomingRequestId.length <= 128
      ? incomingRequestId
      : randomHex(16);

    const incomingTraceparent = req.header('traceparent');
    const traceparent = validTraceparent(incomingTraceparent)
      ? incomingTraceparent!
      : `00-${randomHex(16)}-${randomHex(8)}-01`;

    res.setHeader('x-request-id', requestId);
    res.setHeader('traceparent', traceparent);

    res.locals.requestId = requestId;
    res.locals.traceparent = traceparent;
    next();
  };
}

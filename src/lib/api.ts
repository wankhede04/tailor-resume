/**
 * Helpers for Next.js Route Handlers — JSON responses, error envelope,
 * request IDs, and zod validation. See TechSpec §4.2 and §6.1.
 */

import { NextResponse } from 'next/server';
import { ZodError, type ZodSchema } from 'zod';
import { ApiError, ErrorCodes, StatusByCode } from './errors';
import { ulid } from 'ulid';

export function requestId(): string {
  return `req_${ulid()}`;
}

export function ok<T>(data: T, init?: { status?: number; headers?: Record<string, string> }) {
  const rid = requestId();
  return NextResponse.json(data, {
    status: init?.status ?? 200,
    headers: {
      'X-Request-Id': rid,
      ...(init?.headers ?? {}),
    },
  });
}

export function fail(err: unknown) {
  const rid = requestId();
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: { code: err.code, message: err.message, details: err.details },
        request_id: rid,
      },
      { status: err.status, headers: { 'X-Request-Id': rid } },
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: ErrorCodes.VALIDATION_FAILED,
          message: 'Request validation failed',
          details: { issues: err.issues },
        },
        request_id: rid,
      },
      { status: StatusByCode.VALIDATION_FAILED, headers: { 'X-Request-Id': rid } },
    );
  }
  // eslint-disable-next-line no-console
  console.error('[api] unhandled', err, 'request_id=', rid);
  return NextResponse.json(
    {
      error: { code: ErrorCodes.INTERNAL, message: 'Internal server error', details: {} },
      request_id: rid,
    },
    { status: 500, headers: { 'X-Request-Id': rid } },
  );
}

export async function parseJson<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  return schema.parse(body);
}

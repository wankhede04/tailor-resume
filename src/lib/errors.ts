/**
 * Centralized error codes per TechSpec §4.2.
 *
 * All API errors return:
 *   { error: { code, message, details }, request_id }
 *
 * with the HTTP status mapped per the spec.
 */

export const ErrorCodes = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  TICKET_NOT_FOUND: 'TICKET_NOT_FOUND',
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  COLUMN_NOT_FOUND: 'COLUMN_NOT_FOUND',
  WORKSPACE_NOT_FOUND: 'WORKSPACE_NOT_FOUND',
  WIP_LIMIT_EXCEEDED: 'WIP_LIMIT_EXCEEDED',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const StatusByCode: Record<ErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TICKET_NOT_FOUND: 404,
  PROJECT_NOT_FOUND: 404,
  COLUMN_NOT_FOUND: 404,
  WORKSPACE_NOT_FOUND: 404,
  WIP_LIMIT_EXCEEDED: 409,
  VERSION_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class ApiError extends Error {
  code: ErrorCode;
  details: Record<string, unknown>;
  status: number;

  constructor(code: ErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = StatusByCode[code];
  }
}

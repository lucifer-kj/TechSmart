export type NormalizedError = {
  code: string;
  message: string;
  httpStatus?: number;
  retryable?: boolean;
  details?: unknown;
};

export function normalizeError(err: unknown, fallbackCode = 'internal_error', httpStatus = 500): NormalizedError {
  if (err && typeof err === 'object') {
    const anyErr = err as { name?: string; message?: string; status?: number; code?: string };
    return {
      code: anyErr.code || anyErr.name || fallbackCode,
      message: anyErr.message || 'An unexpected error occurred',
      httpStatus: anyErr.status || httpStatus,
      retryable: anyErr.status ? anyErr.status >= 500 : undefined,
    };
  }
  return { code: fallbackCode, message: String(err ?? 'Unknown error'), httpStatus };
}



interface DataEnvelope<T> {
  data: T;
}

interface ErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;

  constructor(message: string, status: number, code?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required.', code?: string, data?: unknown) {
    super(message, 401, code, data);
    this.name = 'UnauthorizedError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json().catch(() => null)) as DataEnvelope<T> | ErrorEnvelope | T | null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error?.message
        ? payload.error.message
        : `Request failed (${response.status})`;
    const code = payload && typeof payload === 'object' && 'error' in payload ? payload.error?.code : undefined;
    if (response.status === 401) {
      throw new UnauthorizedError(message, code, payload);
    }
    throw new ApiError(message, response.status, code, payload);
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }

  return payload as T;
}

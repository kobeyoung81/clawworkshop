import { apiBaseUrl } from '../config.ts'

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(toApiUrl(path), {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    let code: string | undefined
    try {
      const payload = (await response.json()) as { error?: { code?: string; message?: string } }
      message = payload.error?.message ?? message
      code = payload.error?.code
    } catch {
      // ignore JSON parsing errors and keep the default message
    }

    throw new ApiError(message, response.status, code)
  }

  return response.json() as Promise<T>
}

function toApiUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  if (apiBaseUrl === '') {
    return path
  }

  return `${apiBaseUrl}${path}`
}

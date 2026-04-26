import { ApiError, fetchJson } from './http.ts'

export interface RuntimeConfig {
  authJwksUrl: string
  authBaseUrl: string
  portalBaseUrl: string
  frontendUrl: string
  artifactBaseUrl: string
  environment: string
}

export interface HealthResponse {
  service: string
  environment: string
  status: string
  timestampUtc: string
  dependencies: Record<string, { ready: boolean; message?: string }>
}

export interface CurrentActorResponse {
  actor: {
    id: string
    subjectType: string
    name?: string
    email?: string
    authSource?: string
  }
}

export async function fetchRuntimeConfig() {
  const response = await fetchJson<{ data: RuntimeConfig }>('/api/v1/config')
  return response.data
}

export async function fetchReadiness() {
  const response = await fetchJson<{ data: HealthResponse }>('/healthz')
  return response.data
}

export async function fetchCurrentActor() {
  try {
    const response = await fetchJson<{ data: CurrentActorResponse }>('/api/v1/auth/me')
    return response.data.actor
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}

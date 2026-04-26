import type { RuntimeConfig } from './api/system.ts'

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

const defaultOrigin = typeof window === 'undefined' ? 'http://localhost:5173' : window.location.origin

export const fallbackRuntimeConfig: RuntimeConfig = {
  authJwksUrl: 'https://losclaws.com/.well-known/jwks.json',
  authBaseUrl: 'https://losclaws.com/auth',
  portalBaseUrl: 'https://losclaws.com',
  frontendUrl: defaultOrigin,
  artifactBaseUrl: `${defaultOrigin}/api/v1/artifacts`,
  environment: 'development',
}

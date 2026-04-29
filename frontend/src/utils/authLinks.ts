import type { RuntimeConfig } from '../api/system.ts'

function ensureTrailingSlash(url: string) {
  return url.endsWith('/') ? url : `${url}/`
}

export function getDashboardUrl(runtimeConfig: RuntimeConfig) {
  return new URL('dashboard', ensureTrailingSlash(runtimeConfig.frontendUrl)).toString()
}

export function getDashboardAuthHref(runtimeConfig: RuntimeConfig) {
  return `${runtimeConfig.portalBaseUrl}/auth.html?redirect=${encodeURIComponent(getDashboardUrl(runtimeConfig))}`
}

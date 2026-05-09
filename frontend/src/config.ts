import type { PublicConfig } from './types';

let cached: Partial<PublicConfig> = {};

interface DataEnvelope<T> {
  data: T;
}

function currentOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return '';
}

function derivedLosClawsBase(): string {
  const origin = currentOrigin();
  if (!origin) {
    return '';
  }

  try {
    const url = new URL(origin);
    if (url.hostname.startsWith('workshop.losclaws.')) {
      url.hostname = url.hostname.replace(/^workshop\./, '');
      return url.origin;
    }
    if (url.hostname.startsWith('workshop.')) {
      url.hostname = url.hostname.replace(/^workshop\./, 'losclaws.');
      return url.origin;
    }
  } catch {
    return '';
  }

  return '';
}

export async function loadConfig(): Promise<void> {
  try {
    const response = await fetch('/api/v1/config', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load config (${response.status})`);
    }
    const payload = (await response.json()) as PublicConfig | DataEnvelope<PublicConfig>;
    cached = 'data' in payload ? payload.data : payload;
  } catch (error) {
    console.warn('Failed to load ClawWorkshop public config. Falling back to local defaults.', error);
  }
}

export function getAuthBase(): string {
  return cached.authBaseUrl || import.meta.env.VITE_AUTH_BASE_URL || derivedLosClawsBase() || 'https://losclaws.com';
}

export function getPortalBase(): string {
  return cached.portalBaseUrl || import.meta.env.VITE_PORTAL_BASE_URL || derivedLosClawsBase() || 'https://losclaws.com';
}

export function getFrontendUrl(): string {
  return cached.frontendUrl || import.meta.env.VITE_FRONTEND_URL || currentOrigin();
}

export function getClawWorkshopSkillURL(): string {
  return (
    cached.clawworkshopSkillUrl ||
    import.meta.env.VITE_CLAWWORKSHOP_SKILL_URL ||
    `${getFrontendUrl().replace(/\/$/, '')}/skill/SKILL.md`
  );
}

export function getSignInUrl(redirectPath?: string): string {
  const base = getAuthBase().replace(/\/$/, '') || getPortalBase().replace(/\/$/, '');
  const redirectTarget =
    redirectPath != null
      ? `${getFrontendUrl().replace(/\/$/, '')}${redirectPath.startsWith('/') ? redirectPath : `/${redirectPath}`}`
      : window.location.href;
  const redirect = encodeURIComponent(redirectTarget);
  return `${base}/auth.html?redirect=${redirect}`;
}

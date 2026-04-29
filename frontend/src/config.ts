import type { PublicConfig } from './types';

let cached: Partial<PublicConfig> = {};

function currentOrigin(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin;
  }
  return '';
}

export async function loadConfig(): Promise<void> {
  try {
    const response = await fetch('/api/v1/config');
    if (!response.ok) {
      throw new Error(`Failed to load config (${response.status})`);
    }
    cached = (await response.json()) as PublicConfig;
  } catch (error) {
    console.warn('Failed to load ClawWorkshop public config. Falling back to local defaults.', error);
  }
}

export function getAuthBase(): string {
  return cached.authBaseUrl || import.meta.env.VITE_AUTH_BASE_URL || 'https://losclaws.com';
}

export function getPortalBase(): string {
  return cached.portalBaseUrl || import.meta.env.VITE_PORTAL_BASE_URL || 'https://losclaws.com';
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

export function getSignInUrl(): string {
  const base = getAuthBase().replace(/\/$/, '') || getPortalBase().replace(/\/$/, '');
  const redirect = encodeURIComponent(window.location.href);
  return `${base}/auth.html?redirect=${redirect}`;
}

import { apiRequest } from './client';
import type { DistrictStatsResponse, PublicProjectTypeSummary } from '../types';

export async function getDistrictStats(): Promise<DistrictStatsResponse> {
  const response = await fetch('/api/stats');
  const payload = (await response.json()) as DistrictStatsResponse;

  if (!response.ok && payload.status !== 'offline') {
    throw new Error('Failed to load district stats');
  }

  return payload;
}

export function listPublicProjectTypes(): Promise<PublicProjectTypeSummary[]> {
  return apiRequest<PublicProjectTypeSummary[]>('/api/v1/flowhub/project-types');
}

export interface PublicConfig {
  authJwksUrl: string;
  authBaseUrl: string;
  portalBaseUrl: string;
  frontendUrl: string;
  artifactBaseUrl: string;
  clawworkshopSkillUrl?: string;
  environment: string;
}

export interface DistrictCounters {
  workspaces: number;
  projectTypes: number;
  projects: number;
  flows: number;
  tasks: number;
  artifacts: number;
}

export interface DistrictStatsResponse {
  district: string;
  status: 'online' | 'offline';
  stats: DistrictCounters;
}

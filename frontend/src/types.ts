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

export interface Actor {
  id: string;
  subjectType: 'human' | 'agent';
  name?: string;
  email?: string;
  roles?: string[];
  authSource?: string;
}

export interface AuditActor {
  id: string;
  subjectType: 'human' | 'agent';
  name?: string;
  email?: string;
}

export interface CurrentActorResponse {
  actor: Actor;
  audit: AuditActor;
}

export interface WorkspaceSummary {
  id: string;
  slug: string;
  name: string;
  defaultLocale: string;
  status: string;
  actorRole?: string;
}

export interface WorkspaceCreateInput {
  slug: string;
  name: string;
  defaultLocale: 'en' | 'zh';
}

export interface ProjectSummary {
  id: string;
  workspaceId: string;
  projectTypeVersionId: string;
  name: string;
  description: string;
  status: string;
  version: number;
  actorProjectRole?: string;
}

export interface TaskSummary {
  id: string;
  flowId: string;
  nodeKey: string;
  nodeKind: string;
  title: string;
  description?: string;
  role?: string;
  prompt?: string;
  status: string;
  claimOwnerId?: string;
  currentAssignmentId?: string;
  currentReviewSessionId?: string;
  currentFeedbackSessionId?: string;
  version: number;
  reads?: string[];
  writes?: string[];
}

export interface TaskInboxItem {
  projectId: string;
  projectName: string;
  workspaceId: string;
  workflowKey: string;
  flowSequence: number;
  actorProjectRole?: string;
  task: TaskSummary;
}

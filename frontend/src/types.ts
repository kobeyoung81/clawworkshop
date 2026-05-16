export interface PublicConfig {
  authJwksUrl: string;
  authBaseUrl: string;
  portalBaseUrl: string;
  frontendUrl: string;
  artifactBaseUrl: string;
  clawworkshopSkillUrl: string;
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

export interface CreateProjectTypeInput {
  workspaceId: string;
  key: string;
  title: string;
  description: string;
  draftJson: unknown;
}

export interface PublishProjectTypeInput {
  projectTypeId: string;
  expectedVersion: number;
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

export interface ProjectParticipant {
  id: string;
  subjectId: string;
  subjectType: string;
  role: string;
  status: string;
}

export interface ProjectDetail extends ProjectSummary {
  projectTypeId?: string;
  parameterValuesJson?: unknown;
  templateWorkflowKeys?: string[];
  participants?: ProjectParticipant[];
}

export interface CreateProjectInput {
  workspaceId: string;
  projectTypeVersionId: string;
  name: string;
  description: string;
  parameterValuesJson: unknown;
  participants?: Array<{
    subjectId: string;
    subjectType: string;
    role: string;
  }>;
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

export interface FlowSummary {
  id: string;
  projectId: string;
  workflowKey: string;
  flowSequence: number;
  status: string;
  blockedReason?: string;
  version: number;
  tasks?: TaskSummary[];
}

export interface AssignmentSummary {
  id: string;
  assigneeId: string;
  assigneeType: string;
  source: string;
  status: string;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewDecisionSummary {
  id: string;
  reviewerId: string;
  outcome: string;
  commentBody: string;
  createdAt: string;
}

export interface ReviewSessionSummary {
  id: string;
  status: string;
  outcome?: string;
  version: number;
  resolvedAt?: string;
  decisions?: ReviewDecisionSummary[];
}

export interface FeedbackEntrySummary {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface FeedbackSessionSummary {
  id: string;
  status: string;
  summary?: string;
  version: number;
  resolvedAt?: string;
  entries?: FeedbackEntrySummary[];
}

export interface ArtifactRevisionSummary {
  id: string;
  revisionNo: number;
  contentKind: string;
  mimeType: string;
  byteSize: number;
  checksumSha256?: string;
  createdBy: string;
  baseRevisionNo: number;
  createdAt: string;
  bodyText?: string;
  bodyJson?: unknown;
  bodyBase64?: string;
}

export interface ArtifactSummary {
  id: string;
  projectId: string;
  artifactKey: string;
  scopeType: string;
  scopeRef: string;
  currentRevisionNo: number;
  version: number;
  currentRevision?: ArtifactRevisionSummary;
  revisions?: ArtifactRevisionSummary[];
}

export interface TaskDetail {
  task: TaskSummary;
  projectId: string;
  workflowKey: string;
  flowSequence: number;
  assignments?: AssignmentSummary[];
  artifacts?: ArtifactSummary[];
  reviewSession?: ReviewSessionSummary;
  feedbackSession?: FeedbackSessionSummary;
}

export interface StartFlowInput {
  projectId: string;
  workflowId: string;
  expectedVersion: number;
}

export interface ArtifactWriteInput {
  artifactKey: string;
  contentKind: string;
  mimeType?: string;
  bodyText?: string;
  bodyJson?: unknown;
  bodyBase64?: string;
  baseRevisionNo?: number;
}

export interface TaskVersionInput {
  taskId: string;
  expectedVersion: number;
}

export interface CompleteTaskInput extends TaskVersionInput {
  outputs: ArtifactWriteInput[];
}

export interface ReviewTaskInput extends TaskVersionInput {
  expectedSessionVersion: number;
  outcome: 'approved' | 'revise';
  comment: string;
}

export interface FeedbackTaskInput extends TaskVersionInput {
  expectedSessionVersion: number;
  summary: string;
  body: string;
}

export interface ProjectTypeSummary {
  id: string;
  workspaceId: string;
  key: string;
  title: string;
  description: string;
  status: string;
  version: number;
  currentDraftJson?: unknown;
}

export interface PublicProjectTypeSummary {
  id: string;
  workspaceId: string;
  workspaceName: string;
  key: string;
  title: string;
  description: string;
  status: string;
  latestVersionId: string;
  latestVersionNo: number;
  publishedAt: string;
}

export interface ProjectTypeVersionSummary {
  id: string;
  projectTypeId: string;
  versionNo: number;
  publishedSnapshotJson?: unknown;
  summaryJson?: unknown;
  publishedBy: string;
  publishedAt: string;
}

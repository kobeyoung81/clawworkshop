import { fetchJson } from './http.ts'

export interface Workspace {
  id: string
  slug: string
  name: string
  defaultLocale: string
  status: string
  actorRole?: string
}

export interface WorkspaceMember {
  id: string
  workspaceId: string
  subjectId: string
  subjectType: string
  role: string
  status: string
}

export interface CreateWorkspaceInput {
  slug: string
  name: string
  defaultLocale: string
}

export interface CreateWorkspaceMemberInput {
  subjectId: string
  subjectType: string
  role: string
  status?: string
}

export interface UpdateWorkspaceMemberInput {
  role?: string
  status?: string
}

export async function listWorkspaces() {
  const response = await fetchJson<{ data: Workspace[] }>('/api/v1/workspaces')
  return response.data
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const response = await fetchJson<{ data: Workspace }>('/api/v1/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function getWorkspace(workspaceId: string) {
  const response = await fetchJson<{ data: Workspace }>(`/api/v1/workspaces/${workspaceId}`)
  return response.data
}

export async function listWorkspaceMembers(workspaceId: string) {
  const response = await fetchJson<{ data: WorkspaceMember[] }>(`/api/v1/workspaces/${workspaceId}/members`)
  return response.data
}

export async function createWorkspaceMember(workspaceId: string, input: CreateWorkspaceMemberInput) {
  const response = await fetchJson<{ data: WorkspaceMember }>(`/api/v1/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return response.data
}

export async function updateWorkspaceMember(
  workspaceId: string,
  memberId: string,
  input: UpdateWorkspaceMemberInput,
) {
  const response = await fetchJson<{ data: WorkspaceMember }>(
    `/api/v1/workspaces/${workspaceId}/members/${memberId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
  return response.data
}

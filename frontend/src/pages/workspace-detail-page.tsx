import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/http.ts'
import {
  createWorkspaceMember,
  getWorkspace,
  listWorkspaceMembers,
  updateWorkspaceMember,
} from '../api/workspaces.ts'

export function WorkspaceDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const [subjectId, setSubjectId] = useState('')
  const [subjectType, setSubjectType] = useState('human')
  const [role, setRole] = useState('member')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const workspaceQuery = useQuery({
    queryKey: ['workspace', id],
    queryFn: () => getWorkspace(id),
    enabled: id !== '',
  })
  const membersQuery = useQuery({
    queryKey: ['workspace-members', id],
    queryFn: () => listWorkspaceMembers(id),
    enabled: id !== '',
  })
  const addMemberMutation = useMutation({
    mutationFn: ({
      workspaceId,
      subjectId,
      subjectType,
      role,
    }: {
      workspaceId: string
      subjectId: string
      subjectType: string
      role: string
    }) =>
      createWorkspaceMember(workspaceId, {
        subjectId,
        subjectType,
        role,
      }),
    onSuccess: () => {
      setSubjectId('')
      setRole('member')
      setErrorMessage(null)
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', id] })
    },
    onError: (error) => {
      setErrorMessage(error instanceof ApiError ? error.message : 'Failed to add member.')
    },
  })
  const updateMemberMutation = useMutation({
    mutationFn: ({
      memberId,
      nextRole,
      nextStatus,
    }: {
      memberId: string
      nextRole: string
      nextStatus: string
    }) => updateWorkspaceMember(id, memberId, { role: nextRole, status: nextStatus }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', id] })
    },
  })

  const workspace = workspaceQuery.data

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <Link to="/workspaces" className="text-sm text-cw-cyan">
          ← Back to workspaces
        </Link>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">
          {workspace?.name ?? 'Workspace'}
        </h2>
        <p className="mt-2 text-sm text-cw-muted">
          {workspace ? `${workspace.slug} · ${workspace.defaultLocale} · ${workspace.actorRole}` : 'Loading workspace...'}
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_380px]">
        <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Members</p>
          <div className="mt-4 space-y-3">
            {membersQuery.data?.map((member) => (
              <article
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-cw-border bg-white/5 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium text-white">{member.subjectId}</p>
                  <p className="text-sm text-cw-muted">
                    {member.subjectType} · {member.status}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    defaultValue={member.role}
                    onChange={(event) =>
                      updateMemberMutation.mutate({
                        memberId: member.id,
                        nextRole: event.target.value,
                        nextStatus: member.status,
                      })
                    }
                    className="rounded-xl border border-cw-border bg-cw-panel-strong px-3 py-2 text-sm text-white"
                  >
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </select>
                  <select
                    defaultValue={member.status}
                    onChange={(event) =>
                      updateMemberMutation.mutate({
                        memberId: member.id,
                        nextRole: member.role,
                        nextStatus: event.target.value,
                      })
                    }
                    className="rounded-xl border border-cw-border bg-cw-panel-strong px-3 py-2 text-sm text-white"
                  >
                    <option value="active">active</option>
                    <option value="disabled">disabled</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Invite member</p>
          <form
            className="mt-4 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              setErrorMessage(null)
              addMemberMutation.mutate({
                workspaceId: id,
                subjectId,
                subjectType,
                role,
              })
            }}
          >
            <label className="block">
              <span className="mb-2 block text-sm text-cw-muted">Subject ID</span>
              <input
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-cw-muted">Subject type</span>
              <select
                value={subjectType}
                onChange={(event) => {
                  const nextType = event.target.value
                  setSubjectType(nextType)
                  if (nextType === 'agent') {
                    setRole('member')
                  }
                }}
                className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              >
                <option value="human">human</option>
                <option value="agent">agent</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-cw-muted">Role</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-cyan/40"
              >
                {subjectType === 'agent' ? (
                  <option value="member">member</option>
                ) : (
                  <>
                    <option value="owner">owner</option>
                    <option value="admin">admin</option>
                    <option value="member">member</option>
                    <option value="viewer">viewer</option>
                  </>
                )}
              </select>
            </label>
            {errorMessage ? <p className="text-sm text-amber-200">{errorMessage}</p> : null}
            <button
              type="submit"
              disabled={addMemberMutation.isPending}
              className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add member'}
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

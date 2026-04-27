import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createWorkspace, listWorkspaces } from '../api/workspaces.ts'
import { ApiError } from '../api/http.ts'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { GlassPanel } from '../components/effects/GlassPanel'

export function WorkspacesPage() {
  const queryClient = useQueryClient()
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [defaultLocale, setDefaultLocale] = useState('en')
  const [formError, setFormError] = useState<string | null>(null)
  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })
  const createWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => {
      setSlug('')
      setName('')
      setFormError(null)
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
    },
    onError: (error) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to create workspace.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    createWorkspaceMutation.mutate({
      slug,
      name,
      defaultLocale,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Workspaces</h1>
      </div>

      <div className="space-y-4">
        {workspacesQuery.data?.map((workspace) => (
          <GlassPanel key={workspace.id} accent="none" className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="mb-2 font-display text-xl font-semibold">🏢 {workspace.name}</h2>
                <p className="mb-4 text-sm text-cw-text-muted">
                  {workspace.slug} · {workspace.defaultLocale}
                </p>
                <Link
                  to={`/workspaces/${workspace.id}`}
                  className="text-sm text-cw-cyan hover:underline"
                >
                  Open Workspace →
                </Link>
              </div>
              <span className="rounded-full border border-cw-purple/30 bg-cw-purple/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cw-purple">
                {workspace.actorRole ?? 'member'}
              </span>
            </div>
          </GlassPanel>
        ))}
        {workspacesQuery.isLoading && (
          <GlassPanel accent="none" className="p-6">
            <p className="text-sm text-cw-text-muted">Loading workspaces...</p>
          </GlassPanel>
        )}
        {workspacesQuery.data?.length === 0 && (
          <GlassPanel accent="none" className="border-dashed p-6">
            <p className="text-sm text-cw-text-muted">No workspaces yet.</p>
          </GlassPanel>
        )}
      </div>

      <GlassPanel accent="cyan" className="p-6">
        <h3 className="mb-4 font-display text-lg font-semibold">Create New Workspace</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-lg border border-cw-border bg-cw-bg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-cw-border bg-cw-bg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Default Locale</label>
            <select
              value={defaultLocale}
              onChange={(e) => setDefaultLocale(e.target.value)}
              className="w-full rounded-lg border border-cw-border bg-cw-bg px-3 py-2 text-sm"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
            </select>
          </div>
          {formError && <p className="text-sm text-cw-error">{formError}</p>}
          <button
            type="submit"
            disabled={createWorkspaceMutation.isPending}
            className="rounded-full bg-cw-cyan px-6 py-2 font-semibold text-cw-bg transition hover:bg-cw-cyan/90 disabled:opacity-50"
          >
            {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
          </button>
        </form>
      </GlassPanel>
    </div>
  )
}

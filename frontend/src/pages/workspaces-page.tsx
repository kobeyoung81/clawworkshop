import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { createWorkspace, listWorkspaces } from '../api/workspaces.ts'
import { ApiError } from '../api/http.ts'
import type { FormEvent } from 'react'
import { useState } from 'react'

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
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_380px]">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Workspace surface</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">Visible workspaces</h2>
        <p className="mt-3 text-sm text-cw-muted">
          Create a workspace, inspect your membership role, and drill into member management.
        </p>

        <div className="mt-6 space-y-3">
          {workspacesQuery.data?.map((workspace) => (
            <Link
              key={workspace.id}
              to={`/workspaces/${workspace.id}`}
              className="flex items-center justify-between rounded-2xl border border-cw-border bg-white/5 px-4 py-4 transition hover:border-cw-cyan/30"
            >
              <div>
                <p className="font-display text-lg font-medium text-white">{workspace.name}</p>
                <p className="text-sm text-cw-muted">
                  {workspace.slug} · {workspace.defaultLocale}
                </p>
              </div>
              <span className="rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cw-magenta">
                {workspace.actorRole ?? 'member'}
              </span>
            </Link>
          ))}
          {workspacesQuery.isLoading ? (
            <div className="rounded-2xl border border-cw-border bg-white/5 px-4 py-6 text-sm text-cw-muted">
              Loading workspaces...
            </div>
          ) : null}
          {workspacesQuery.data?.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-cw-border px-4 py-6 text-sm text-cw-muted">
              No workspaces yet.
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">Create workspace</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none ring-0 transition focus:border-cw-cyan/40"
              placeholder="Moonforge Studio"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none ring-0 transition focus:border-cw-cyan/40"
              placeholder="moonforge-studio"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Default locale</span>
            <select
              value={defaultLocale}
              onChange={(event) => setDefaultLocale(event.target.value)}
              className="w-full rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none ring-0 transition focus:border-cw-cyan/40"
            >
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
            </select>
          </label>
          {formError ? <p className="text-sm text-amber-200">{formError}</p> : null}
          <button
            type="submit"
            disabled={createWorkspaceMutation.isPending}
            className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createWorkspaceMutation.isPending ? 'Creating...' : 'Create workspace'}
          </button>
        </form>
      </section>
    </div>
  )
}

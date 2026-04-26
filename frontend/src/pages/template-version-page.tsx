import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getProjectTypeVersion } from '../api/project-types.ts'

export function TemplateVersionPage() {
  const { id = '', versionId = '' } = useParams()
  const versionQuery = useQuery({
    queryKey: ['project-type-version', id, versionId],
    queryFn: () => getProjectTypeVersion(id, versionId),
    enabled: id !== '' && versionId !== '',
  })

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <Link to={`/templates/${id}`} className="text-sm text-cw-cyan">
          ← Back to template draft
        </Link>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">
          Template version {versionQuery.data?.versionNo ?? ''}
        </h2>
        <p className="mt-2 text-sm text-cw-muted">{versionQuery.data?.publishedAt ?? 'Loading version...'}</p>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Summary JSON</p>
          <pre className="mt-4 overflow-x-auto rounded-[20px] border border-cw-border bg-cw-panel-strong p-4 text-sm text-cw-text">
            {JSON.stringify(versionQuery.data?.summaryJson ?? {}, null, 2)}
          </pre>
        </section>

        <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Published snapshot</p>
          <pre className="mt-4 overflow-x-auto rounded-[20px] border border-cw-border bg-cw-panel-strong p-4 text-sm text-cw-text">
            {JSON.stringify(versionQuery.data?.publishedSnapshotJson ?? {}, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  )
}

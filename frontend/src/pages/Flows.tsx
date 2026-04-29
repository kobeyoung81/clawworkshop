import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listTaskInbox } from '../api/runtime.ts'

export function Flows() {
  const inboxQuery = useQuery({
    queryKey: ['task-inbox'],
    queryFn: () => listTaskInbox(),
    refetchInterval: 20_000,
  })

  return (
    <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-cyan">Execution view</p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-white">Task inbox</h2>
      <p className="mt-3 text-sm text-cw-muted">
        Poll-friendly queue across visible workspaces. Open a flow run to inspect instructions, artifacts, and review state.
      </p>

      <div className="mt-6 space-y-3">
        {inboxQuery.data?.map((item) => (
          <Link
            key={item.task.id}
            to={`/flows/${item.task.flowId}?task=${item.task.id}`}
            className="block rounded-2xl border border-cw-border bg-white/5 px-4 py-4 transition hover:border-cw-cyan/30"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-white">
                  {item.task.title} · {item.projectName}
                </p>
                <p className="mt-1 text-sm text-cw-muted">
                  {item.workflowKey} run {item.flowSequence} · {item.task.status}
                </p>
              </div>
              <span className="rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cw-magenta">
                {item.task.nodeKind}
              </span>
            </div>
            {item.task.prompt ? <p className="mt-3 text-sm text-cw-muted">{item.task.prompt}</p> : null}
          </Link>
        ))}
        {inboxQuery.isLoading ? (
          <div className="rounded-2xl border border-cw-border bg-white/5 px-4 py-6 text-sm text-cw-muted">
            Loading inbox...
          </div>
        ) : null}
        {inboxQuery.data?.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cw-border px-4 py-6 text-sm text-cw-muted">
            No open tasks in the inbox.
          </div>
        ) : null}
      </div>
    </section>
  )
}

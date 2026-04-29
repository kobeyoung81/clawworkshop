import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listEvents, listProjects, listTaskInbox } from '../api/runtime.ts'
import { fetchDistrictStats } from '../api/system.ts'
import { GlassPanel } from '../components/effects/GlassPanel'
import { ShimmerCard, ShimmerLoader } from '../components/effects/ShimmerLoader'
import { useCurrentActor } from '../hooks/useCurrentActor.ts'
import { formatRelativeTime } from '../utils/formatRelativeTime.ts'

export function Dashboard() {
  const currentActorQuery = useCurrentActor()
  const actor = currentActorQuery.data
  const isAuthenticated = actor !== null

  const projectsQuery = useQuery({
    queryKey: ['projects', 'dashboard'],
    queryFn: listProjects,
    enabled: isAuthenticated,
  })
  const inboxQuery = useQuery({
    queryKey: ['task-inbox', 'dashboard'],
    queryFn: () => listTaskInbox(undefined, 12),
    enabled: isAuthenticated,
    refetchInterval: 20_000,
  })
  const eventsQuery = useQuery({
    queryKey: ['events', 'dashboard', 'desc'],
    queryFn: () => listEvents({ limit: 40, order: 'desc' }),
    enabled: isAuthenticated,
    refetchInterval: 20_000,
  })
  const statsQuery = useQuery({
    queryKey: ['district-stats', 'dashboard'],
    queryFn: fetchDistrictStats,
    refetchInterval: 30_000,
  })

  if (!currentActorQuery.isLoading && !actor) {
    return (
      <GlassPanel accent="purple" className="p-6">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-cw-purple">Dashboard locked</p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in to load your personal dashboard</h1>
        <p className="mt-3 max-w-2xl text-sm text-cw-text-muted">
          The dashboard uses your visible projects, inbox tasks, recent artifact revisions, and personal activity from the
          runtime API, so it only appears after authentication.
        </p>
        <Link
          to="/"
          className="mt-5 inline-flex border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20"
        >
          Back to overview
        </Link>
      </GlassPanel>
    )
  }

  const projects = projectsQuery.data ?? []
  const taskInbox = inboxQuery.data ?? []
  const myEvents = (eventsQuery.data ?? []).filter((event) => event.actorId === actor?.id)
  const recentArtifacts = myEvents.filter((event) => event.topic === 'artifact_revised').slice(0, 3)
  const waitingOnMe = taskInbox.filter((item) =>
    ['ready', 'awaiting_review', 'awaiting_feedback', 'in_progress'].includes(item.task.status),
  )

  const projectCounts = {
    active: projects.filter((project) => project.status === 'active').length,
    pendingReview: taskInbox.filter((item) => item.task.status === 'awaiting_review').length,
    completed: projects.filter((project) => project.status === 'completed').length,
  }
  const activityCounts = {
    tasksDone: myEvents.filter((event) => event.topic === 'task_completed').length,
    reviewsGiven: myEvents.filter((event) => event.topic === 'review_submitted').length,
    artifacts: myEvents.filter((event) => event.topic === 'artifact_revised').length,
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cw-cyan">Personal runtime view</p>
          <h1 className="mt-2 text-3xl font-semibold">My Dashboard</h1>
          <p className="mt-2 text-sm text-cw-text-muted">
            Signed in as {actor?.name ?? actor?.email ?? actor?.id}. Monitor your queue, projects, and recent artifact work
            from one place.
          </p>
        </div>
        <Link to="/flows" className="text-sm text-cw-cyan hover:underline">
          Open full inbox
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">My Active Tasks</h2>
          <span className="text-sm text-cw-text-muted">{taskInbox.length} visible in queue</span>
        </div>

        {inboxQuery.isLoading ? (
          <ShimmerLoader rows={2} />
        ) : taskInbox.length > 0 ? (
          <div className="space-y-4">
            {taskInbox.slice(0, 3).map((item) => (
              <GlassPanel key={item.task.id} accent="cyan" className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-cw-text">{item.task.title}</h3>
                    <p className="mt-2 text-sm text-cw-text-muted">
                      {item.workflowKey} → {item.task.nodeKind} · {item.projectName}
                    </p>
                    <p className="mt-1 text-sm text-cw-text-muted">
                      Status: {item.task.status.replaceAll('_', ' ')} · flow run {item.flowSequence}
                    </p>
                  </div>
                  <span className="rounded-full border border-cw-cyan/20 bg-cw-cyan/5 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-cw-cyan">
                    {item.task.status}
                  </span>
                </div>
                <Link to={`/flows/${item.task.flowId}?task=${item.task.id}`} className="mt-4 inline-flex text-sm text-cw-cyan hover:underline">
                  Open task →
                </Link>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel accent="none" className="border-dashed p-6">
            <p className="text-sm text-cw-text-muted">No active tasks are assigned or visible right now.</p>
          </GlassPanel>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="My Projects"
          accent="cyan"
          rows={[
            ['Active', projectCounts.active],
            ['Pending review', projectCounts.pendingReview],
            ['Completed', projectCounts.completed],
          ]}
        />
        <StatCard
          title="My Activity"
          accent="magenta"
          rows={[
            ['Tasks done', activityCounts.tasksDone],
            ['Reviews given', activityCounts.reviewsGiven],
            ['Artifacts revised', activityCounts.artifacts],
          ]}
        />
        <StatCard
          title="District Snapshot"
          accent="purple"
          rows={[
            ['Projects', statsQuery.data?.stats.projects ?? 0],
            ['Flows', statsQuery.data?.stats.flows ?? 0],
            ['Tasks', statsQuery.data?.stats.tasks ?? 0],
          ]}
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Artifacts I Created</h2>
        {eventsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
          </div>
        ) : recentArtifacts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {recentArtifacts.map((event) => (
              <GlassPanel key={event.id} accent="none" className="p-5">
                <div className="mb-3 text-2xl">📄</div>
                <h3 className="font-semibold text-cw-text">{String(event.payloadJson?.artifactKey ?? 'artifact')}</h3>
                <p className="mt-2 text-sm text-cw-text-muted">
                  {findProjectName(projects, event.projectId) ?? 'Unknown project'}
                </p>
                <p className="mt-1 text-xs text-cw-text-muted">
                  Revision {String(event.payloadJson?.revisionNo ?? 'n/a')} · {formatRelativeTime(event.createdAt)}
                </p>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel accent="none" className="border-dashed p-6">
            <p className="text-sm text-cw-text-muted">No artifact revisions authored by this account have been recorded yet.</p>
          </GlassPanel>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Waiting on Me</h2>
        <GlassPanel accent="none" className="p-5">
          {waitingOnMe.length > 0 ? (
            <div className="space-y-3">
              {waitingOnMe.slice(0, 4).map((item) => (
                <div key={item.task.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-cw-border pb-3 last:border-b-0 last:pb-0">
                  <div>
                    <p className="font-medium text-cw-text">{item.task.title}</p>
                    <p className="mt-1 text-sm text-cw-text-muted">
                      {item.projectName} · {item.task.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <Link to={`/flows/${item.task.flowId}?task=${item.task.id}`} className="text-sm text-cw-cyan hover:underline">
                    Open →
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cw-text-muted">Nothing is blocked on your input right now.</p>
          )}
        </GlassPanel>
      </section>
    </div>
  )
}

function StatCard({
  title,
  rows,
  accent,
}: {
  title: string
  rows: Array<[label: string, value: number]>
  accent: 'cyan' | 'magenta' | 'purple'
}) {
  return (
    <GlassPanel accent={accent} className="p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <dl className="mt-4 space-y-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-cw-text-muted">{label}</dt>
            <dd className="font-semibold text-cw-text">{value}</dd>
          </div>
        ))}
      </dl>
    </GlassPanel>
  )
}

function findProjectName(projects: Array<{ id: string; name: string }>, projectId?: string) {
  return projects.find((project) => project.id === projectId)?.name
}

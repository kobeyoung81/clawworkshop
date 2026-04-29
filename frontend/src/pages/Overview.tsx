import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { listEvents, listProjects, listTaskInbox } from '../api/runtime.ts'
import { fetchDistrictStats } from '../api/system.ts'
import { GlassPanel } from '../components/effects/GlassPanel'
import { ShimmerCard } from '../components/effects/ShimmerLoader'
import { useCurrentActor } from '../hooks/useCurrentActor.ts'
import { formatRelativeTime } from '../utils/formatRelativeTime.ts'

export function Overview() {
  const currentActorQuery = useCurrentActor()
  const isAuthenticated = currentActorQuery.data !== null

  const statsQuery = useQuery({
    queryKey: ['district-stats'],
    queryFn: fetchDistrictStats,
    refetchInterval: 30_000,
  })
  const projectsQuery = useQuery({
    queryKey: ['projects', 'overview'],
    queryFn: listProjects,
    enabled: isAuthenticated,
  })
  const inboxQuery = useQuery({
    queryKey: ['task-inbox', 'overview'],
    queryFn: () => listTaskInbox(undefined, 6),
    enabled: isAuthenticated,
    refetchInterval: 20_000,
  })
  const eventsQuery = useQuery({
    queryKey: ['events', 'overview', 'desc'],
    queryFn: () => listEvents({ limit: 6, order: 'desc' }),
    enabled: isAuthenticated,
    refetchInterval: 20_000,
  })

  const recentProjects = (projectsQuery.data ?? []).slice(0, 3)
  const activeTasks = (inboxQuery.data ?? []).slice(0, 4)
  const recentEvents = (eventsQuery.data ?? []).slice(0, 4)

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px] xl:items-start">
        <div className="space-y-6">
          <div className="space-y-4">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cw-text-muted">workshop.losclaws.com</p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-cw-text sm:text-5xl">
              <span className="text-cw-purple">⚡</span> ClawWorkshop control room
            </h1>
            <p className="max-w-2xl text-base text-cw-text-muted sm:text-lg">
              Author reusable workflow templates, execute live project flows, and keep every task, review, and artifact
              tied back to the runtime.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/dashboard" className="border border-cw-cyan bg-cw-cyan px-5 py-3 text-sm font-semibold text-cw-bg transition hover:bg-cw-cyan/90">
              My Dashboard
            </Link>
            <Link
              to="/projects"
              className="border border-cw-cyan/30 bg-cw-cyan/10 px-5 py-3 text-sm font-semibold text-cw-cyan transition hover:bg-cw-cyan/20"
            >
              Launch Project
            </Link>
            <Link
              to="/templates"
              className="border border-cw-border bg-cw-surface px-5 py-3 text-sm font-semibold text-cw-text-muted transition hover:border-cw-cyan/30 hover:text-cw-text"
            >
              Templates
            </Link>
          </div>

          {!isAuthenticated && !currentActorQuery.isLoading ? (
            <GlassPanel accent="purple" className="p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-cw-purple">Sign in required</p>
              <p className="mt-3 text-sm text-cw-text-muted">
                The live dashboard, projects, inbox, and activity panels appear after you sign in with your Los Claws account.
              </p>
            </GlassPanel>
          ) : null}
        </div>

        <GlassPanel accent="cyan" className="p-6">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-cw-cyan">District snapshot</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <SnapshotStat label="Workspaces" value={statsQuery.data?.stats.workspaces} />
            <SnapshotStat label="Templates" value={statsQuery.data?.stats.projectTypes} />
            <SnapshotStat label="Projects" value={statsQuery.data?.stats.projects} />
            <SnapshotStat label="Flows" value={statsQuery.data?.stats.flows} />
            <SnapshotStat label="Tasks" value={statsQuery.data?.stats.tasks} />
            <SnapshotStat label="Artifacts" value={statsQuery.data?.stats.artifacts} />
          </div>
          <div className="mt-5 border-t border-cw-border pt-4 text-sm text-cw-text-muted">
            <p>Status: {statsQuery.data?.status ?? 'loading'}</p>
            <p className="mt-1">
              {currentActorQuery.data
                ? `Signed in as ${currentActorQuery.data.name ?? currentActorQuery.data.email ?? currentActorQuery.data.id}.`
                : 'Browse the district overview now and sign in for personalized runtime data.'}
            </p>
          </div>
        </GlassPanel>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold">Recent Projects</h2>
          <Link to="/projects" className="text-sm text-cw-cyan hover:underline">
            View all projects
          </Link>
        </div>
        {projectsQuery.isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            <ShimmerCard />
            <ShimmerCard />
            <ShimmerCard />
          </div>
        ) : recentProjects.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {recentProjects.map((project) => (
              <GlassPanel key={project.id} accent="none" className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-cw-text">{project.name}</h3>
                    <p className="mt-2 text-sm text-cw-text-muted">{project.description || 'No project summary yet.'}</p>
                  </div>
                  <span className="rounded-full border border-cw-cyan/20 bg-cw-cyan/5 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.18em] text-cw-cyan">
                    {project.status}
                  </span>
                </div>
                <div className="mt-4 text-sm text-cw-text-muted">
                  <p>{project.templateWorkflowKeys.length} workflow template(s)</p>
                  <p className="mt-1">{project.actorProjectRole ? `Role: ${project.actorProjectRole}` : 'Visible via workspace access'}</p>
                </div>
                <Link to={`/projects/${project.id}`} className="mt-4 inline-flex text-sm text-cw-cyan hover:underline">
                  Open project →
                </Link>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel accent="none" className="border-dashed p-6">
            <p className="text-sm text-cw-text-muted">No live projects are visible yet.</p>
          </GlassPanel>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <GlassPanel accent="cyan" className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-cw-cyan">Execution view</p>
              <h2 className="mt-2 text-2xl font-semibold">Active inbox tasks</h2>
            </div>
            <Link to="/flows" className="text-sm text-cw-cyan hover:underline">
              Open inbox
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {inboxQuery.isLoading ? (
              <>
                <ShimmerCard />
                <ShimmerCard />
              </>
            ) : activeTasks.length > 0 ? (
              activeTasks.map((item) => (
                <Link
                  key={item.task.id}
                  to={`/flows/${item.task.flowId}?task=${item.task.id}`}
                  className="block border border-cw-border bg-cw-surface px-4 py-4 transition hover:border-cw-cyan/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-cw-text">{item.task.title}</p>
                      <p className="mt-1 text-sm text-cw-text-muted">
                        {item.projectName} · {item.workflowKey} run {item.flowSequence}
                      </p>
                    </div>
                    <span className="text-xs font-mono uppercase tracking-[0.18em] text-cw-magenta">{item.task.status}</span>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-cw-text-muted">No open tasks are waiting in the inbox.</p>
            )}
          </div>
        </GlassPanel>

        <GlassPanel accent="purple" className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-cw-purple">Runtime feed</p>
              <h2 className="mt-2 text-2xl font-semibold">Recent activity</h2>
            </div>
            <Link to="/activity" className="text-sm text-cw-cyan hover:underline">
              Open feed
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {eventsQuery.isLoading ? (
              <>
                <ShimmerCard />
                <ShimmerCard />
              </>
            ) : recentEvents.length > 0 ? (
              recentEvents.map((event) => (
                <div key={event.id} className="border border-cw-border bg-cw-surface px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-cw-text">{describeEvent(event.topic, event.payloadJson)}</p>
                    <span className="text-xs font-mono uppercase tracking-[0.18em] text-cw-text-muted">
                      {formatRelativeTime(event.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-cw-text-muted">
                    {event.projectId ? `Project ${event.projectId}` : 'District-wide event'} · actor {event.actorId}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-cw-text-muted">No recent runtime events are available.</p>
            )}
          </div>
        </GlassPanel>
      </section>
    </div>
  )
}

function SnapshotStat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="border border-cw-border bg-cw-surface px-4 py-4">
      <p className="text-xs font-mono uppercase tracking-[0.18em] text-cw-text-muted">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-cw-text">{value ?? '—'}</p>
    </div>
  )
}

function describeEvent(topic: string, payload: Record<string, unknown> | null) {
  switch (topic) {
    case 'artifact_revised':
      return `Artifact ${String(payload?.artifactKey ?? 'update')} revised`
    case 'task_completed':
      return `Task ${String(payload?.nodeKey ?? 'node')} completed`
    case 'review_submitted':
      return `Review ${String(payload?.outcome ?? 'submitted')}`
    case 'feedback_submitted':
      return `Feedback submitted`
    case 'flow_started':
      return `Flow ${String(payload?.workflowKey ?? 'run')} started`
    default:
      return topic.replaceAll('_', ' ')
  }
}

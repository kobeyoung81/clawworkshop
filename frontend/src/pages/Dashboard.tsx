import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWorkspace, getCurrentActor, listProjects, listTaskInbox, listWorkspaces } from '../api/dashboard';
import { UnauthorizedError } from '../api/client';
import { getSignInUrl } from '../config';
import { GlassPanel } from '../components/effects/GlassPanel';
import { DistrictBackground } from '../components/effects/DistrictBackground';
import { useI18n } from '../i18n';
import type { ProjectSummary, WorkspaceSummary } from '../types';

interface WorkspaceGroup {
  workspace: WorkspaceSummary;
  projects: ProjectSummary[];
}

interface StatCardProps {
  label: string;
  value: string;
  accent: 'cyan' | 'mag' | 'amber' | 'none';
}

function formatCount(value: number, lang: 'en' | 'zh'): string {
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(value);
}

function statusTone(status: string): string {
  switch (status) {
    case 'active':
    case 'ready':
    case 'in_progress':
      return 'border-accent-cyan/20 bg-accent-cyan/8 text-accent-cyan';
    case 'awaiting_review':
    case 'awaiting_feedback':
      return 'border-accent-amber/20 bg-accent-amber/8 text-accent-amber';
    case 'completed':
      return 'border-white/10 bg-white/5 text-white';
    default:
      return 'border-accent-mag/20 bg-accent-mag/8 text-accent-mag';
  }
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <GlassPanel accentColor={accent} className="p-5">
      <div className="mb-1 text-xs font-mono uppercase tracking-[0.24em] text-text-muted">{label}</div>
      <div className="font-display text-3xl font-bold text-white">{value}</div>
    </GlassPanel>
  );
}

function EmptyPanel({
  title,
  body,
  actionLabel,
  actionHref,
}: {
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <GlassPanel accentColor="mag" className="p-8">
      <h2 className="mb-3 text-2xl font-semibold text-white">{title}</h2>
      <p className="max-w-xl text-sm leading-7 text-text-muted">{body}</p>
      {actionLabel && actionHref ? (
        <div className="mt-6">
          <a href={actionHref} className="btn-cyber">
            {actionLabel}
          </a>
        </div>
      ) : null}
    </GlassPanel>
  );
}

function DashboardLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <GlassPanel className="min-h-[560px] p-6">
        <div className="space-y-4">
          <div className="h-5 w-32 rounded shimmer-bg" />
          <div className="h-16 rounded-xl shimmer-bg" />
          <div className="h-16 rounded-xl shimmer-bg" />
          <div className="h-16 rounded-xl shimmer-bg" />
        </div>
      </GlassPanel>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <GlassPanel key={index} className="p-5">
              <div className="h-4 w-20 rounded shimmer-bg" />
              <div className="mt-3 h-8 w-16 rounded shimmer-bg" />
            </GlassPanel>
          ))}
        </div>
        <GlassPanel className="min-h-[360px] p-6">
          <div />
        </GlassPanel>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { t, lang } = useI18n();
  const queryClient = useQueryClient();
  const [collapsedWorkspaceIds, setCollapsedWorkspaceIds] = useState<string[]>([]);
  const [isAddWorkspaceOpen, setIsAddWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [workspaceLocale, setWorkspaceLocale] = useState<'en' | 'zh'>(lang);

  const actorQuery = useQuery({
    queryKey: ['current-actor'],
    queryFn: getCurrentActor,
    retry: false,
  });

  const workspacesQuery = useQuery({
    queryKey: ['dashboard-workspaces'],
    queryFn: listWorkspaces,
    enabled: actorQuery.isSuccess,
  });

  const projectsQuery = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: listProjects,
    enabled: actorQuery.isSuccess,
  });

  const tasksQuery = useQuery({
    queryKey: ['dashboard-task-inbox'],
    queryFn: listTaskInbox,
    enabled: actorQuery.isSuccess,
    refetchInterval: 30_000,
  });

  const addWorkspaceMutation = useMutation({
    mutationFn: createWorkspace,
    onSuccess: async () => {
      setWorkspaceName('');
      setWorkspaceSlug('');
      setWorkspaceLocale(lang);
      setIsAddWorkspaceOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['dashboard-workspaces'] });
    },
  });

  const workspaces = useMemo(() => workspacesQuery.data ?? [], [workspacesQuery.data]);
  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const taskItems = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const workspaceById = useMemo(() => new Map(workspaces.map((workspace) => [workspace.id, workspace])), [workspaces]);

  const workspaceGroups = useMemo<WorkspaceGroup[]>(
    () =>
      workspaces.map((workspace) => ({
        workspace,
        projects: projects.filter((project) => project.workspaceId === workspace.id),
      })),
    [projects, workspaces],
  );

  const dataError = workspacesQuery.error ?? projectsQuery.error ?? tasksQuery.error;

  const stats = useMemo(
    () => ({
      workspaces: workspaces.length,
      projects: projects.length,
      activeTasks: taskItems.length,
      readyTasks: taskItems.filter((item) => item.task.status === 'ready').length,
    }),
    [projects.length, taskItems, workspaces.length],
  );

  const toggleWorkspace = (workspaceId: string) => {
    setCollapsedWorkspaceIds((current) =>
      current.includes(workspaceId) ? current.filter((id) => id !== workspaceId) : [...current, workspaceId],
    );
  };

  const toggleAddWorkspace = () => {
    setIsAddWorkspaceOpen((current) => {
      const next = !current;
      if (next) {
        setWorkspaceLocale(lang);
      }
      return next;
    });
  };

  const submitWorkspace = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addWorkspaceMutation.mutate({
      slug: workspaceSlug.trim().toLowerCase(),
      name: workspaceName.trim(),
      defaultLocale: workspaceLocale,
    });
  };

  const actorError = actorQuery.error;
  const isUnauthorized = actorError instanceof UnauthorizedError || (actorError && 'status' in actorError && actorError.status === 401);

  if (actorQuery.isPending) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-surface/45 p-4 circuit-grid sm:p-6">
        <DistrictBackground className="opacity-60" />
        <div className="relative">
          <DashboardLoading />
        </div>
      </div>
    );
  }

  if (isUnauthorized) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-surface/45 p-4 circuit-grid sm:p-6">
        <DistrictBackground className="opacity-60" />
        <div className="relative">
          <EmptyPanel
            title={t('dashboard.auth_required_title')}
            body={t('dashboard.auth_required_body')}
            actionLabel={t('dashboard.sign_in_cta')}
            actionHref={getSignInUrl('/dashboard')}
          />
        </div>
      </div>
    );
  }

  if (actorQuery.error || dataError) {
    return (
      <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-surface/45 p-4 circuit-grid sm:p-6">
        <DistrictBackground className="opacity-60" />
        <div className="relative">
          <EmptyPanel title={t('dashboard.error_title')} body={t('dashboard.error_body')} />
        </div>
      </div>
    );
  }

  const actor = actorQuery.data.actor;

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-surface/45 p-4 circuit-grid sm:p-6">
      <DistrictBackground className="opacity-60" />

      <div className="relative grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <GlassPanel className="flex min-h-[640px] flex-col overflow-hidden lg:sticky lg:top-24">
          <div className="border-b border-white/8 px-5 py-5">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-accent-cyan/70">{t('dashboard.sidebar_eyebrow')}</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-white">{t('dashboard.sidebar_title')}</h2>
                <p className="mt-1 text-sm text-text-muted">{t('dashboard.sidebar_desc')}</p>
              </div>
              <div className="rounded-full border border-accent-cyan/15 bg-accent-cyan/8 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-cyan">
                {formatCount(workspaces.length, lang)}
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {workspacesQuery.isPending || projectsQuery.isPending ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-white/6 p-4">
                  <div className="h-4 w-24 rounded shimmer-bg" />
                  <div className="mt-3 space-y-2">
                    <div className="h-3 rounded shimmer-bg" />
                    <div className="h-3 rounded shimmer-bg" />
                  </div>
                </div>
              ))
            ) : workspaceGroups.length > 0 ? (
              workspaceGroups.map((group) => {
                const expanded = !collapsedWorkspaceIds.includes(group.workspace.id);
                return (
                  <div key={group.workspace.id} className="rounded-2xl border border-white/8 bg-black/10">
                    <button
                      type="button"
                      onClick={() => toggleWorkspace(group.workspace.id)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{group.workspace.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                          <span>{group.workspace.actorRole ?? t('dashboard.role_unknown')}</span>
                          <span className="text-white/15">•</span>
                          <span>{formatCount(group.projects.length, lang)} {t('dashboard.projects_short')}</span>
                        </div>
                      </div>
                      <span className={`text-xs text-text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>⌄</span>
                    </button>

                    {expanded ? (
                      <div className="border-t border-white/6 px-2 py-2">
                        {group.projects.length > 0 ? (
                          group.projects.map((project) => (
                            <div
                              key={project.id}
                              className="mb-1 flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-left text-text-muted transition-all hover:bg-white/3 hover:text-white"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{project.name}</div>
                                <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.16em]">{t(`dashboard.statuses.${project.status}`)}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-text-muted">{t('dashboard.no_projects_in_workspace')}</div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">
                {t('dashboard.no_workspaces')}
              </div>
            )}
          </div>

          <div className="border-t border-white/8 px-4 py-4">
            <button
              type="button"
              onClick={toggleAddWorkspace}
              disabled={actor.subjectType !== 'human'}
              className="btn-cyber-outline flex w-full items-center justify-center px-4 py-3 text-xs disabled:cursor-not-allowed disabled:border-white/10 disabled:text-text-muted/60 disabled:shadow-none disabled:hover:bg-transparent"
            >
              {t('dashboard.add_workspace')}
            </button>

            {isAddWorkspaceOpen ? (
              <form onSubmit={submitWorkspace} className="mt-4 space-y-3 rounded-2xl border border-white/8 bg-black/10 p-4">
                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.workspace_name')}
                  </label>
                  <input
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                    placeholder={t('dashboard.workspace_name_placeholder')}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.workspace_slug')}
                  </label>
                  <input
                    value={workspaceSlug}
                    onChange={(event) => setWorkspaceSlug(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                    placeholder={t('dashboard.workspace_slug_placeholder')}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">
                    {t('dashboard.workspace_locale')}
                  </label>
                  <select
                    value={workspaceLocale}
                    onChange={(event) => setWorkspaceLocale(event.target.value as 'en' | 'zh')}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                  >
                    <option value="en">{t('dashboard.locale_en')}</option>
                    <option value="zh">{t('dashboard.locale_zh')}</option>
                  </select>
                </div>

                {addWorkspaceMutation.error ? (
                  <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">
                    {addWorkspaceMutation.error.message}
                  </div>
                ) : null}

                <div className="flex items-center gap-2">
                  <button type="submit" disabled={addWorkspaceMutation.isPending} className="btn-cyber px-4 py-2 text-xs">
                    {addWorkspaceMutation.isPending ? t('dashboard.creating_workspace') : t('dashboard.create_workspace')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddWorkspaceOpen(false)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs font-mono uppercase tracking-[0.18em] text-text-muted transition-colors hover:border-white/20 hover:text-white"
                  >
                    {t('dashboard.cancel')}
                  </button>
                </div>
              </form>
            ) : actor.subjectType !== 'human' ? (
              <p className="mt-3 text-sm text-text-muted">{t('dashboard.workspace_create_humans_only')}</p>
            ) : null}
          </div>
        </GlassPanel>

        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label={t('dashboard.stats.workspaces')} value={formatCount(stats.workspaces, lang)} accent="cyan" />
            <StatCard label={t('dashboard.stats.projects')} value={formatCount(stats.projects, lang)} accent="amber" />
            <StatCard label={t('dashboard.stats.active_tasks')} value={formatCount(stats.activeTasks, lang)} accent="mag" />
            <StatCard label={t('dashboard.stats.ready_tasks')} value={formatCount(stats.readyTasks, lang)} accent="cyan" />
          </div>

          <GlassPanel className="p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('dashboard.tasks_eyebrow')}</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">{t('dashboard.tasks_title')}</h2>
              </div>
              <div className="text-sm text-text-muted">{t('dashboard.tasks_count', { count: taskItems.length })}</div>
            </div>

            {tasksQuery.isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-white/8 p-4">
                    <div className="h-4 w-48 rounded shimmer-bg" />
                    <div className="mt-3 h-3 rounded shimmer-bg" />
                  </div>
                ))}
              </div>
            ) : taskItems.length > 0 ? (
              <div className="space-y-3">
                {taskItems.map((item) => {
                  const workspace = workspaceById.get(item.workspaceId);
                  return (
                    <div key={item.task.id} className="rounded-2xl border border-white/8 bg-black/10 p-4 transition-colors hover:border-accent-cyan/15">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">{item.task.title || item.task.nodeKey}</h3>
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(item.task.status)}`}>
                              {t(`dashboard.statuses.${item.task.status}`)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-text-muted">
                            {workspace?.name ?? t('dashboard.unknown_workspace')} / {item.projectName}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                            <span>{item.workflowKey}</span>
                            <span className="text-white/15">•</span>
                            <span>{t('dashboard.flow_label', { flow: item.flowSequence })}</span>
                            <span className="text-white/15">•</span>
                            <span>{item.task.nodeKind}</span>
                            {item.task.role ? (
                              <>
                                <span className="text-white/15">•</span>
                                <span>{item.task.role}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">
                {t('dashboard.no_active_tasks')}
              </div>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}

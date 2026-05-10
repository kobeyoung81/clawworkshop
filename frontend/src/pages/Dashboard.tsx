import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { createWorkspace, getCurrentActor, listProjects, listTaskInbox, listWorkspaces } from '../api/dashboard';
import { UnauthorizedError } from '../api/client';
import { DistrictBackground } from '../components/effects/DistrictBackground';
import { GlassPanel } from '../components/effects/GlassPanel';
import { getSignInUrl } from '../config';
import { useI18n } from '../i18n';
import type { ProjectSummary, WorkspaceSummary } from '../types';
import type { DashboardShellContextValue } from './dashboard/context';
import { EmptyPanel } from './dashboard/shared';
import { formatCount } from './dashboard/utils';

interface WorkspaceGroup {
  workspace: WorkspaceSummary;
  projects: ProjectSummary[];
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
  const location = useLocation();
  const { workspaceId, projectId } = useParams();
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

  const activeProject = projectId ? projects.find((project) => project.id === projectId) ?? null : null;
  const activeWorkspaceId = workspaceId ?? activeProject?.workspaceId ?? null;
  const isProjectCreateRoute = location.pathname.endsWith('/projects/new');
  const dataError = workspacesQuery.error ?? projectsQuery.error ?? tasksQuery.error;

  const toggleWorkspace = (targetWorkspaceId: string) => {
    setCollapsedWorkspaceIds((current) =>
      current.includes(targetWorkspaceId) ? current.filter((id) => id !== targetWorkspaceId) : [...current, targetWorkspaceId],
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

  const isBootstrapping =
    actorQuery.isPending ||
    (workspacesQuery.isPending && !workspacesQuery.data) ||
    (projectsQuery.isPending && !projectsQuery.data) ||
    (tasksQuery.isPending && !tasksQuery.data);

  if (isBootstrapping) {
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
  const shellContext: DashboardShellContextValue = {
    actor,
    workspaces,
    projects,
    taskItems,
    workspaceById,
  };

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
                const isWorkspaceActive = activeWorkspaceId === group.workspace.id;
                const expanded = isWorkspaceActive || !collapsedWorkspaceIds.includes(group.workspace.id);
                const isCreateActive = isWorkspaceActive && isProjectCreateRoute;

                return (
                  <div key={group.workspace.id} className={`rounded-2xl border bg-black/10 ${isWorkspaceActive ? 'border-accent-cyan/20' : 'border-white/8'}`}>
                    <div className="flex items-stretch gap-2 p-2">
                      <NavLink
                        to={`/dashboard/workspaces/${group.workspace.id}`}
                        className={`min-w-0 flex-1 rounded-xl px-3 py-3 text-left transition-colors ${
                          isWorkspaceActive ? 'bg-accent-cyan/10 text-white' : 'text-text-muted hover:bg-white/3 hover:text-white'
                        }`}
                      >
                        <div className="truncate text-sm font-semibold">{group.workspace.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.18em] text-inherit/80">
                          <span>{group.workspace.actorRole ?? t('dashboard.role_unknown')}</span>
                          <span className="text-white/15">•</span>
                          <span>
                            {formatCount(group.projects.length, lang)} {t('dashboard.projects_short')}
                          </span>
                        </div>
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => toggleWorkspace(group.workspace.id)}
                        className="rounded-xl px-3 text-xs text-text-muted transition-colors hover:bg-white/3 hover:text-white"
                        aria-label={t('dashboard.toggle_workspace')}
                      >
                        <span className={`block transition-transform ${expanded ? 'rotate-180' : ''}`}>⌄</span>
                      </button>
                    </div>

                    {expanded ? (
                      <div className="border-t border-white/6 px-2 py-2">
                        {group.projects.length > 0 ? (
                          group.projects.map((project) => (
                            <NavLink
                              key={project.id}
                              to={`/dashboard/projects/${project.id}`}
                              className={({ isActive }) =>
                                `mb-1 flex items-start justify-between gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                                  isActive ? 'bg-accent-cyan/10 text-white ring-1 ring-accent-cyan/25' : 'text-text-muted hover:bg-white/3 hover:text-white'
                                }`
                              }
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{project.name}</div>
                                <div className="mt-1 text-[11px] font-mono uppercase tracking-[0.16em]">{t(`dashboard.statuses.${project.status}`)}</div>
                              </div>
                            </NavLink>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-text-muted">{t('dashboard.no_projects_in_workspace')}</div>
                        )}

                        {actor.subjectType === 'human' ? (
                          <NavLink
                            to={`/dashboard/workspaces/${group.workspace.id}/projects/new`}
                            className={`mt-2 flex w-full items-center justify-center rounded-xl border px-3 py-2 text-[11px] font-mono uppercase tracking-[0.18em] transition-colors ${
                              isCreateActive
                                ? 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan'
                                : 'border-white/10 text-text-muted hover:border-accent-cyan/20 hover:text-white'
                            }`}
                          >
                            {t('dashboard.new_project_short')}
                          </NavLink>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-6 text-sm text-text-muted">{t('dashboard.no_workspaces')}</div>
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
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('dashboard.workspace_name')}</label>
                  <input
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                    placeholder={t('dashboard.workspace_name_placeholder')}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('dashboard.workspace_slug')}</label>
                  <input
                    value={workspaceSlug}
                    onChange={(event) => setWorkspaceSlug(event.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-surface/80 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-accent-cyan/35"
                    placeholder={t('dashboard.workspace_slug_placeholder')}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted">{t('dashboard.workspace_locale')}</label>
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
                  <div className="rounded-xl border border-accent-mag/20 bg-accent-mag/8 px-3 py-2 text-sm text-accent-mag">{addWorkspaceMutation.error.message}</div>
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

        <Outlet context={shellContext} />
      </div>
    </div>
  );
}

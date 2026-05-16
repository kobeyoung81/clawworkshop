import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GlassPanel } from '../../components/effects/GlassPanel';
import { useI18n } from '../../i18n';
import { useDashboardShellContext } from './context';
import { StatCard } from './shared';
import { formatCount, statusTone } from './utils';

export function DashboardHomeView() {
  const { t, lang } = useI18n();
  const { workspaces, projects, taskItems, workspaceById } = useDashboardShellContext();

  const stats = useMemo(
    () => ({
      workspaces: workspaces.length,
      projects: projects.length,
      activeTasks: taskItems.length,
      readyTasks: taskItems.filter((item) => item.task.status === 'ready').length,
    }),
    [projects.length, taskItems, workspaces.length],
  );

  return (
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

        {taskItems.length > 0 ? (
          <div className="space-y-3">
            {taskItems.map((item) => {
              const workspace = workspaceById.get(item.workspaceId);
              return (
                <Link
                  key={item.task.id}
                  to={`/dashboard/tasks/${item.task.id}`}
                  className="block rounded-2xl border border-white/8 bg-black/10 p-4 transition-colors hover:border-accent-cyan/15"
                >
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
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('dashboard.no_active_tasks')}</div>
        )}
      </GlassPanel>
    </div>
  );
}

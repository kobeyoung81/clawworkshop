import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getPublicProjectType, listPublicProjectTypes } from '../api/public';
import { DistrictBackground } from '../components/effects/DistrictBackground';
import { GlassPanel } from '../components/effects/GlassPanel';
import { useI18n } from '../i18n';
import { EmptyPanel } from './dashboard/shared';

function statusTone(status: string): string {
  if (status === 'published') {
    return 'border-accent-cyan/20 bg-accent-cyan/8 text-accent-cyan';
  }

  return 'border-white/10 bg-white/5 text-text-muted';
}

function formatPublishedAt(value: string, lang: 'en' | 'zh'): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function FlowHub() {
  const { t, lang } = useI18n();
  const { projectTypeId } = useParams();

  const publicProjectTypesQuery = useQuery({
    queryKey: ['public-flowhub-project-types'],
    queryFn: listPublicProjectTypes,
  });

  const publicProjectTypeQuery = useQuery({
    queryKey: ['public-flowhub-project-type', projectTypeId],
    queryFn: () => getPublicProjectType(projectTypeId ?? ''),
    enabled: Boolean(projectTypeId),
  });

  const publicProjectTypes = useMemo(() => publicProjectTypesQuery.data ?? [], [publicProjectTypesQuery.data]);
  const selectedProjectType = publicProjectTypeQuery.data;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[28px] border border-white/6 bg-surface/45 p-4 circuit-grid sm:p-6">
        <DistrictBackground className="opacity-60" />
        <div className="relative space-y-6">
          <GlassPanel accentColor="cyan" className="p-6">
            <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.eyebrow')}</div>
            <h1 className="mt-3 text-3xl font-bold text-white">{t('flowhub.title')}</h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-text-muted">{t('flowhub.desc')}</p>
          </GlassPanel>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
            <GlassPanel className="p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.catalog_eyebrow')}</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{t('flowhub.catalog_title')}</h2>
                </div>
                <div className="text-sm text-text-muted">{t('flowhub.catalog_count', { count: publicProjectTypes.length })}</div>
              </div>

              {publicProjectTypesQuery.isPending ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-white/8 p-5">
                      <div className="h-5 w-40 rounded shimmer-bg" />
                      <div className="mt-4 h-4 w-24 rounded shimmer-bg" />
                      <div className="mt-4 space-y-2">
                        <div className="h-3 rounded shimmer-bg" />
                        <div className="h-3 rounded shimmer-bg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : publicProjectTypesQuery.error ? (
                <EmptyPanel title={t('flowhub.catalog_error_title')} body={t('flowhub.catalog_error_body')} />
              ) : publicProjectTypes.length > 0 ? (
                <div className="space-y-3">
                  {publicProjectTypes.map((projectType) => {
                    const isActive = projectType.id === projectTypeId;
                    return (
                      <Link
                        key={projectType.id}
                        to={`/flowhub/${projectType.id}`}
                        className={`block rounded-2xl border p-5 transition-colors ${
                          isActive ? 'border-accent-cyan/25 bg-accent-cyan/8' : 'border-white/8 bg-black/10 hover:border-accent-cyan/15'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-white">{projectType.title}</h3>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(projectType.status)}`}>
                            {t(`flowhub.statuses.${projectType.status}`)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                          <span>{projectType.workspaceName}</span>
                          <span className="text-white/15">•</span>
                          <span>{projectType.key}</span>
                          <span className="text-white/15">•</span>
                          <span>{t('flowhub.latest_version', { version: projectType.latestVersionNo })}</span>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-text-muted">{projectType.description || t('flowhub.no_description')}</p>
                        <div className="mt-4 text-xs font-mono uppercase tracking-[0.16em] text-text-muted">
                          {t('flowhub.published_at', { date: formatPublishedAt(projectType.publishedAt, lang) })}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('flowhub.no_public_project_types')}</div>
              )}
            </GlassPanel>

            <GlassPanel className="p-6">
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-[0.24em] text-accent-cyan/60">{t('flowhub.detail_eyebrow')}</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{t('flowhub.detail_title')}</h2>
                </div>
                <Link
                  to="/design"
                  className="rounded-xl border border-white/10 px-3 py-2 text-[11px] font-mono uppercase tracking-[0.18em] text-text-muted transition-colors hover:border-accent-cyan/20 hover:text-white"
                >
                  {t('flowhub.open_design_cta')}
                </Link>
              </div>

              {!projectTypeId ? (
                <div className="rounded-2xl border border-white/8 bg-black/10 px-4 py-8 text-sm text-text-muted">{t('flowhub.select_project_type')}</div>
              ) : publicProjectTypeQuery.isPending ? (
                <div className="space-y-3">
                  <div className="h-5 w-48 rounded shimmer-bg" />
                  <div className="h-4 w-32 rounded shimmer-bg" />
                  <div className="h-[420px] rounded-2xl shimmer-bg" />
                </div>
              ) : publicProjectTypeQuery.error || !selectedProjectType ? (
                <EmptyPanel title={t('flowhub.detail_error_title')} body={t('flowhub.detail_error_body')} />
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-2xl font-semibold text-white">{selectedProjectType.title}</h3>
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${statusTone(selectedProjectType.status)}`}>
                        {t(`flowhub.statuses.${selectedProjectType.status}`)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-[0.16em] text-text-muted">
                      <span>{selectedProjectType.workspaceName}</span>
                      <span className="text-white/15">•</span>
                      <span>{selectedProjectType.key}</span>
                      <span className="text-white/15">•</span>
                      <span>{t('flowhub.latest_version', { version: selectedProjectType.latestVersionNo })}</span>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-text-muted">{selectedProjectType.description || t('flowhub.no_description')}</p>
                  </div>

                  <div>
                    <div className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-text-muted">{t('flowhub.dsl_label')}</div>
                    <pre className="max-h-[70vh] overflow-auto rounded-2xl border border-white/8 bg-black/25 p-5 font-mono text-xs leading-6 text-white">
                      {JSON.stringify(selectedProjectType.publishedSnapshotJson ?? {}, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </GlassPanel>
          </div>
        </div>
      </div>
    </div>
  );
}

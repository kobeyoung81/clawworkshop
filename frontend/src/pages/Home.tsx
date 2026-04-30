import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDistrictStats } from '../api/public';
import { getClawWorkshopSkillURL } from '../config';
import { GlassPanel } from '../components/effects/GlassPanel';
import { ParticleCanvas } from '../components/effects/ParticleCanvas';
import { RevealOnScroll } from '../components/effects/RevealOnScroll';
import { DistrictBackground } from '../components/effects/DistrictBackground';
import { useI18n } from '../i18n';
import type { DistrictCounters, DistrictStatsResponse } from '../types';

function formatValue(value: number | undefined, lang: 'en' | 'zh'): string {
  if (typeof value !== 'number') {
    return '\u2014';
  }
  return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(value);
}

function HeroStat({
  value,
  label,
  delay = 0,
}: {
  value: string;
  label: string;
  delay?: number;
}) {
  return (
    <RevealOnScroll delay={delay}>
      <div className="glass rounded-xl p-4 text-center">
        <div className="mb-1 font-mono text-3xl font-bold text-accent-cyan text-glow-cyan">{value}</div>
        <div className="text-xs font-mono uppercase tracking-widest text-text-muted">{label}</div>
      </div>
    </RevealOnScroll>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <RevealOnScroll>
      <div className="mb-8 max-w-2xl">
        <div className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-accent-cyan/60">{eyebrow}</div>
        <h2 className="mb-3 font-display text-3xl font-bold text-white">{title}</h2>
        <p className="text-sm leading-7 text-text-muted">{description}</p>
      </div>
    </RevealOnScroll>
  );
}

function CapabilityCard({
  icon,
  title,
  description,
  accentColor,
  delay,
}: {
  icon: string;
  title: string;
  description: string;
  accentColor: 'cyan' | 'mag' | 'amber' | 'none';
  delay: number;
}) {
  return (
    <RevealOnScroll delay={delay}>
      <GlassPanel accentColor={accentColor} className="h-full p-6">
        <div className="mb-4 text-2xl">{icon}</div>
        <h3 className="mb-3 font-display text-xl font-semibold text-white">{title}</h3>
        <p className="text-sm leading-7 text-text-muted">{description}</p>
      </GlassPanel>
    </RevealOnScroll>
  );
}

function StepCard({
  step,
  title,
  description,
  delay,
}: {
  step: string;
  title: string;
  description: string;
  delay: number;
}) {
  return (
    <RevealOnScroll delay={delay}>
      <div className="glass rounded-xl p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-accent-cyan/20 bg-accent-cyan/10 font-mono text-xs font-semibold text-accent-cyan">
            {step}
          </div>
          <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm leading-7 text-text-muted">{description}</p>
      </div>
    </RevealOnScroll>
  );
}

function StatsGrid({ counters, lang }: { counters: DistrictCounters | undefined; lang: 'en' | 'zh' }) {
  const { t } = useI18n();
  const items = [
    { key: 'workspaces', label: t('stats.workspaces'), value: counters?.workspaces },
    { key: 'projectTypes', label: t('stats.project_types'), value: counters?.projectTypes },
    { key: 'projects', label: t('stats.projects'), value: counters?.projects },
    { key: 'flows', label: t('stats.flows'), value: counters?.flows },
    { key: 'tasks', label: t('stats.tasks'), value: counters?.tasks },
    { key: 'artifacts', label: t('stats.artifacts'), value: counters?.artifacts },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      {items.map((item, index) => (
        <RevealOnScroll key={item.key} delay={index * 60}>
          <div className="glass rounded-xl p-4">
            <div className="mb-1 text-xs font-mono uppercase tracking-[0.24em] text-text-muted">{item.label}</div>
            <div className="font-display text-3xl font-bold text-white">{formatValue(item.value, lang)}</div>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  );
}

function SkillBox() {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const text = t('home.skill_prompt', { url: getClawWorkshopSkillURL() });

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    });
  };

  return (
    <div className="mt-6 max-w-[560px] animate-fade-up" style={{ animationDelay: '400ms' }}>
      <p className="mb-2 text-xs font-mono uppercase tracking-wide text-text-muted">{t('home.skill_title')}</p>
      <div className="relative rounded-lg border border-white/10 bg-black/30 px-4 py-3 pr-12">
        <button
          onClick={handleCopy}
          className="absolute right-2 top-2 text-sm opacity-60 transition-opacity hover:opacity-100"
          title={t('home.copy')}
        >
          {copied ? <span className="text-xs font-mono text-accent-cyan">{t('home.skill_copied')}</span> : '📋'}
        </button>
        <code className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-text-muted">{text}</code>
      </div>
    </div>
  );
}

export function Home() {
  const { t, lang } = useI18n();
  const { data } = useQuery<DistrictStatsResponse>({
    queryKey: ['district-stats'],
    queryFn: getDistrictStats,
    refetchInterval: 30_000,
  });

  return (
    <div className="-mx-4 min-h-screen sm:-mx-6 lg:-mx-8">
      <section id="overview" className="circuit-grid relative flex min-h-[68vh] items-center justify-center overflow-hidden">
        <ParticleCanvas density={50} speed={0.25} />
        <DistrictBackground />

        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          <div
            className="mb-4 inline-block font-mono text-xs uppercase tracking-[0.3em] text-accent-cyan/60 animate-fade-up"
            style={{ animationDelay: '0ms' }}
          >
            {t('home.eyebrow')}
          </div>
          <h1
            className="mb-4 font-display text-5xl font-bold tracking-[-0.03em] text-white text-glow-cyan animate-fade-up sm:text-7xl"
            style={{ animationDelay: '100ms' }}
          >
            <span>{t('home.title_prefix')}</span>{' '}
            <span className="text-accent-cyan">{t('home.title_accent')}</span>
          </h1>
          <p
            className="mx-auto mb-8 max-w-2xl text-lg text-text-muted animate-fade-up"
            style={{ animationDelay: '200ms' }}
          >
            {t('home.desc')}
          </p>
          <div className="flex flex-col items-center justify-center gap-4 animate-fade-up sm:flex-row" style={{ animationDelay: '300ms' }}>
            <a href="#platform" className="btn-cyber">
              {t('home.primary_cta')}
            </a>
            <a href="#stats" className="btn-cyber-outline px-6 py-2 font-mono text-sm uppercase tracking-widest">
              {t('home.secondary_cta')}
            </a>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <HeroStat value={formatValue(data?.stats.projectTypes, lang)} label={t('home.project_types')} delay={0} />
            <HeroStat value={formatValue(data?.stats.flows, lang)} label={t('home.flows')} delay={80} />
            <HeroStat value={formatValue(data?.stats.tasks, lang)} label={t('home.tasks')} delay={160} />
          </div>
          <div className="flex justify-center">
            <SkillBox />
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-bg to-transparent" />
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t('platform.eyebrow')}
          title={t('platform.title')}
          description={t('platform.desc')}
        />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CapabilityCard
            icon="🧩"
            title={t('platform.cards.authoring.title')}
            description={t('platform.cards.authoring.desc')}
            accentColor="cyan"
            delay={0}
          />
          <CapabilityCard
            icon="⚙️"
            title={t('platform.cards.runtime.title')}
            description={t('platform.cards.runtime.desc')}
            accentColor="amber"
            delay={80}
          />
          <CapabilityCard
            icon="🧠"
            title={t('platform.cards.collaboration.title')}
            description={t('platform.cards.collaboration.desc')}
            accentColor="mag"
            delay={160}
          />
          <CapabilityCard
            icon="🛡"
            title={t('platform.cards.audit.title')}
            description={t('platform.cards.audit.desc')}
            accentColor="cyan"
            delay={240}
          />
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-4 pb-18 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t('workflow.eyebrow')}
          title={t('workflow.title')}
          description={t('workflow.desc')}
        />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <StepCard step="01" title={t('workflow.steps.author.title')} description={t('workflow.steps.author.desc')} delay={0} />
          <StepCard step="02" title={t('workflow.steps.instantiate.title')} description={t('workflow.steps.instantiate.desc')} delay={80} />
          <StepCard step="03" title={t('workflow.steps.execute.title')} description={t('workflow.steps.execute.desc')} delay={160} />
          <StepCard step="04" title={t('workflow.steps.review.title')} description={t('workflow.steps.review.desc')} delay={240} />
        </div>
      </section>

      <section id="stats" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow={t('stats.eyebrow')}
          title={t('stats.title')}
          description={t('stats.desc', { district: data?.district ?? 'workshop' })}
        />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <StatsGrid counters={data?.stats} lang={lang} />
          <RevealOnScroll delay={120}>
            <GlassPanel accentColor={data?.status === 'offline' ? 'mag' : 'cyan'} className="h-full p-6">
              <div className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-accent-cyan/60">
                {t('stats.status_label')}
              </div>
              <div className="mb-4 font-display text-3xl font-bold text-white">
                {data?.status === 'offline' ? t('stats.offline') : t('stats.online')}
              </div>
              <p className="mb-6 text-sm leading-7 text-text-muted">{t('stats.status_desc')}</p>
              <div className="space-y-3 text-sm text-text-muted">
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                  <span>{t('stats.environment')}</span>
                  <span className="font-mono uppercase text-white">{import.meta.env.MODE}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                  <span>{t('stats.public_config')}</span>
                  <span className="font-mono text-accent-cyan">/api/v1/config</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span>{t('stats.district_stats')}</span>
                  <span className="font-mono text-accent-cyan">/api/stats</span>
                </div>
              </div>
            </GlassPanel>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
}

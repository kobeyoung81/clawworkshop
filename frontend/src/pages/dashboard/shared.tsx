import { GlassPanel } from '../../components/effects/GlassPanel';

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: 'cyan' | 'mag' | 'amber' | 'none';
}) {
  return (
    <GlassPanel accentColor={accent} className="p-5">
      <div className="mb-1 text-xs font-mono uppercase tracking-[0.24em] text-text-muted">{label}</div>
      <div className="font-display text-3xl font-bold text-white">{value}</div>
    </GlassPanel>
  );
}

export function EmptyPanel({
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

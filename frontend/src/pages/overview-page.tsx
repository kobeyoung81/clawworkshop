const focusAreas = [
  {
    title: 'Authoring surface',
    body: 'Define project types, evolve JSON drafts, and validate workflow graphs before publish.',
  },
  {
    title: 'Runtime execution',
    body: 'Materialize projects and flows from immutable template versions with version-safe task transitions.',
  },
  {
    title: 'Artifact durability',
    body: 'Store markdown, JSON, images, and generated output directly in MySQL-backed artifact revisions.',
  },
]

export function OverviewPage() {
  return (
    <section className="space-y-6">
      <div className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Phase 0 foundation</p>
        <h2 className="mt-3 font-display text-3xl font-semibold text-white">Implementation runway is ready</h2>
        <p className="mt-3 max-w-3xl text-cw-muted">
          The repo now has the district shell, runtime config endpoint, health checks, local MySQL workflow,
          and the frontend navigation model that later feature modules can plug into.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {focusAreas.map((item) => (
          <article
            key={item.title}
            className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur"
          >
            <h3 className="font-display text-xl font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-6 text-cw-muted">{item.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

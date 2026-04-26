import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-amber">404</p>
      <h2 className="mt-3 font-display text-3xl font-semibold text-white">Route not found</h2>
      <p className="mt-3 text-cw-muted">The current app shell only exposes the v1 district landing routes.</p>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan transition hover:bg-cw-cyan/20"
      >
        Back to overview
      </Link>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { GlassPanel } from '../components/effects/GlassPanel'

export function OverviewPage() {

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="flex min-h-[50vh] flex-col items-center justify-center space-y-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-cw-text-muted">
          workshop.losclaws.com
        </p>
        <h1 className="font-display text-6xl font-bold tracking-tight">
          <span className="text-cw-purple">⚡</span> CLAWWORKSHOP <span className="text-cw-purple">⚡</span>
        </h1>
        <p className="max-w-2xl text-lg text-cw-text-muted">
          The workflow management and agent collaboration district
        </p>
        <div className="flex gap-4">
          <Link
            to="/dashboard"
            className="rounded-full bg-cw-cyan px-6 py-3 font-semibold text-cw-bg transition hover:bg-cw-cyan/90"
          >
            My Dashboard
          </Link>
          <Link
            to="/projects"
            className="rounded-full border border-cw-cyan bg-cw-cyan/10 px-6 py-3 font-semibold text-cw-cyan transition hover:bg-cw-cyan/20"
          >
            Launch Project
          </Link>
          <Link
            to="/templates"
            className="rounded-full border border-cw-border px-6 py-3 font-semibold text-cw-text-muted transition hover:border-cw-cyan hover:text-cw-text"
          >
            Templates
          </Link>
        </div>
      </section>

      {/* Recent Projects */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-semibold">Recent Projects</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <GlassPanel accent="none" className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cw-error" />
              <h3 className="font-display text-lg font-semibold">Q1 Report</h3>
            </div>
            <p className="mb-2 text-sm text-cw-text-muted">In Progress</p>
            <p className="mb-4 text-sm text-cw-text-muted">3 artifacts</p>
            <Link to="/projects/1" className="text-sm text-cw-cyan hover:underline">
              View Project →
            </Link>
          </GlassPanel>

          <GlassPanel accent="none" className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cw-success" />
              <h3 className="font-display text-lg font-semibold">API Redesign</h3>
            </div>
            <p className="mb-2 text-sm text-cw-text-muted">Active</p>
            <p className="mb-4 text-sm text-cw-text-muted">12 artifacts</p>
            <Link to="/projects/2" className="text-sm text-cw-cyan hover:underline">
              View Project →
            </Link>
          </GlassPanel>

          <GlassPanel accent="none" className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cw-idle" />
              <h3 className="font-display text-lg font-semibold">Blog Posts</h3>
            </div>
            <p className="mb-2 text-sm text-cw-text-muted">Planning</p>
            <p className="mb-4 text-sm text-cw-text-muted">0 artifacts</p>
            <Link to="/projects/3" className="text-sm text-cw-cyan hover:underline">
              View Project →
            </Link>
          </GlassPanel>
        </div>
      </section>

      {/* Active Flows */}
      <section className="space-y-6">
        <h2 className="font-display text-2xl font-semibold">Active Flows</h2>
        <div className="space-y-3">
          <GlassPanel accent="cyan" className="p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cw-success" />
              <span className="font-semibold">Research Phase → Review</span>
            </div>
            <p className="mt-2 text-sm text-cw-text-muted">
              Project: Q1 Report • Waiting for @alice feedback
            </p>
          </GlassPanel>

          <GlassPanel accent="cyan" className="p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cw-warning" />
              <span className="font-semibold">Draft Creation → Work</span>
            </div>
            <p className="mt-2 text-sm text-cw-text-muted">
              Project: API Redesign • @claude-agent writing
            </p>
          </GlassPanel>
        </div>
      </section>
    </div>
  )
}


import { Link } from 'react-router-dom'
import { GlassPanel } from '../components/effects/GlassPanel'

export function DashboardPage() {

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold">My Dashboard</h1>

      {/* My Active Tasks */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">My Active Tasks</h2>

        <GlassPanel accent="cyan" className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cw-warning" />
            <h3 className="font-semibold">Review Required</h3>
          </div>
          <p className="mb-1 text-sm text-cw-text-muted">Research Phase → Review Node</p>
          <p className="mb-4 text-sm text-cw-text-muted">Project: Q1 Report • Assigned 2h ago</p>
          <Link to="/flows/1" className="text-sm text-cw-cyan hover:underline">
            Review Now →
          </Link>
        </GlassPanel>

        <GlassPanel accent="cyan" className="p-6">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cw-success" />
            <h3 className="font-semibold">Work in Progress</h3>
          </div>
          <p className="mb-1 text-sm text-cw-text-muted">Draft Creation → Work Node</p>
          <p className="mb-4 text-sm text-cw-text-muted">Project: API Redesign • Started 15m ago</p>
          <Link to="/flows/2" className="text-sm text-cw-cyan hover:underline">
            Continue Work →
          </Link>
        </GlassPanel>
      </section>

      {/* Stats */}
      <section className="grid gap-6 md:grid-cols-2">
        <GlassPanel accent="none" className="p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">My Projects</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-cw-text-muted">Active</dt>
              <dd className="font-semibold">5</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cw-text-muted">Pending Review</dt>
              <dd className="font-semibold">2</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cw-text-muted">Completed</dt>
              <dd className="font-semibold">8</dd>
            </div>
          </dl>
        </GlassPanel>

        <GlassPanel accent="none" className="p-6">
          <h3 className="mb-4 font-display text-lg font-semibold">My Activity</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-cw-text-muted">Tasks Done</dt>
              <dd className="font-semibold">12</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cw-text-muted">Reviews Given</dt>
              <dd className="font-semibold">3</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-cw-text-muted">Artifacts</dt>
              <dd className="font-semibold">45</dd>
            </div>
          </dl>
        </GlassPanel>
      </section>

      {/* Recent Artifacts */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Recent Artifacts I Created</h2>
        <div className="grid gap-6 md:grid-cols-3">
          <GlassPanel accent="none" className="p-4">
            <div className="mb-2 text-2xl">📄</div>
            <h3 className="mb-1 font-semibold">research.md</h3>
            <p className="mb-1 text-sm text-cw-text-muted">Q1 Report</p>
            <p className="text-xs text-cw-text-muted">2h ago</p>
          </GlassPanel>

          <GlassPanel accent="none" className="p-4">
            <div className="mb-2 text-2xl">📊</div>
            <h3 className="mb-1 font-semibold">data.json</h3>
            <p className="mb-1 text-sm text-cw-text-muted">API Redesign</p>
            <p className="text-xs text-cw-text-muted">5h ago</p>
          </GlassPanel>

          <GlassPanel accent="none" className="p-4">
            <div className="mb-2 text-2xl">🖼️</div>
            <h3 className="mb-1 font-semibold">chart.png</h3>
            <p className="mb-1 text-sm text-cw-text-muted">Blog Posts</p>
            <p className="text-xs text-cw-text-muted">1d ago</p>
          </GlassPanel>
        </div>
      </section>

      {/* Waiting on Me */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold">Waiting on Me</h2>
        <GlassPanel accent="none" className="p-4">
          <ul className="space-y-2 text-sm">
            <li className="text-cw-text-muted">• @alice requested feedback on requirements.md</li>
            <li className="text-cw-text-muted">• @bob needs approval for design-spec.md</li>
          </ul>
        </GlassPanel>
      </section>
    </div>
  )
}

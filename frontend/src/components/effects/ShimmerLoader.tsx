interface ShimmerLoaderProps {
  rows?: number
  className?: string
}

export function ShimmerLoader({ rows = 3, className = '' }: ShimmerLoaderProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl bg-cw-surface"
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  )
}

export function ShimmerCard({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-3 rounded-xl border border-cw-border bg-cw-surface p-4 ${className}`}>
      <div className="h-4 w-1/3 animate-pulse rounded bg-cw-border" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-cw-border" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-cw-border" />
    </div>
  )
}

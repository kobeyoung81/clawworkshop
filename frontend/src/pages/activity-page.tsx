import { useMutation, useQuery } from '@tanstack/react-query'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { ApiError } from '../api/http.ts'
import { listEvents, updateEventCursor } from '../api/runtime.ts'

export function ActivityPage() {
  const [sinceSeq, setSinceSeq] = useState('0')
  const [message, setMessage] = useState<string | null>(null)

  const parsedSinceSeq = Number.parseInt(sinceSeq, 10)
  const eventsQuery = useQuery({
    queryKey: ['events', Number.isNaN(parsedSinceSeq) ? 0 : parsedSinceSeq],
    queryFn: () =>
      listEvents({
        sinceSeq: Number.isNaN(parsedSinceSeq) ? 0 : parsedSinceSeq,
        limit: 100,
      }),
    refetchInterval: 20_000,
  })

  const cursorMutation = useMutation({
    mutationFn: (lastSeenSeq: number) => updateEventCursor('default', lastSeenSeq),
    onSuccess: (cursor) => {
      setMessage(`Cursor saved at seq ${cursor.lastSeenSeq}.`)
    },
    onError: (error) => {
      setMessage(error instanceof ApiError ? error.message : 'Failed to update cursor.')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
  }

  const latestSeq = eventsQuery.data && eventsQuery.data.length > 0 ? eventsQuery.data[eventsQuery.data.length - 1].seq : 0

  return (
    <section className="rounded-[24px] border border-cw-border bg-cw-panel p-6 backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-cw-magenta">Activity feed</p>
          <h2 className="mt-3 font-display text-3xl font-semibold text-white">Pollable event model</h2>
        </div>
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-cw-muted">Since seq</span>
            <input
              value={sinceSeq}
              onChange={(event) => setSinceSeq(event.target.value)}
              className="rounded-2xl border border-cw-border bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cw-magenta/40"
            />
          </label>
          <button
            type="submit"
            className="inline-flex rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-4 py-2 text-sm font-medium text-cw-magenta"
          >
            Refresh feed
          </button>
          <button
            type="button"
            disabled={latestSeq === 0 || cursorMutation.isPending}
            onClick={() => cursorMutation.mutate(latestSeq)}
            className="inline-flex rounded-full border border-cw-cyan/30 bg-cw-cyan/10 px-4 py-2 text-sm font-medium text-cw-cyan disabled:cursor-not-allowed disabled:opacity-60"
          >
            Mark seen
          </button>
        </form>
      </div>

      {message ? <p className="mt-4 text-sm text-amber-200">{message}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-cw-border">
        {eventsQuery.data?.map((event, index) => (
          <div
            key={event.id}
            className={`space-y-2 bg-white/5 px-4 py-4 text-sm text-cw-muted ${
              index !== eventsQuery.data.length - 1 ? 'border-b border-cw-border' : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-white">seq {event.seq}</span>
              <span className="rounded-full border border-cw-magenta/30 bg-cw-magenta/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cw-magenta">
                {event.topic}
              </span>
            </div>
            <p>
              {event.subjectType} {event.subjectId} · actor {event.actorId}
            </p>
            {event.payloadJson ? (
              <pre className="overflow-x-auto rounded-2xl border border-cw-border bg-cw-panel-strong p-3 text-xs whitespace-pre-wrap text-cw-text">
                {JSON.stringify(event.payloadJson, null, 2)}
              </pre>
            ) : null}
          </div>
        ))}
        {eventsQuery.isLoading ? (
          <div className="bg-white/5 px-4 py-6 text-sm text-cw-muted">Loading events...</div>
        ) : null}
        {eventsQuery.data?.length === 0 ? (
          <div className="bg-white/5 px-4 py-6 text-sm text-cw-muted">No events in this range.</div>
        ) : null}
      </div>
    </section>
  )
}

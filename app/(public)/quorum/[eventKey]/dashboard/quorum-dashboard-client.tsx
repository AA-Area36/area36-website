"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Check, Clock3, Radio, Users, Vote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PublicQuorumEvent, QuorumSummary } from "@/lib/quorum/types"
import { QuorumAdminPanel } from "./quorum-admin-panel"

export function QuorumDashboardClient({ event, initialSummary }: { event: PublicQuorumEvent; initialSummary: QuorumSummary }) {
  const [summary, setSummary] = useState(initialSummary)
  const [connectionError, setConnectionError] = useState(false)
  const refreshInFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (document.hidden || refreshInFlight.current) return
    refreshInFlight.current = true
    try {
      const response = await fetch(`/api/quorum/${event.eventKey}/summary`, { cache: "no-store" })
      if (!response.ok) throw new Error("Summary unavailable")
      setSummary((await response.json()) as QuorumSummary)
      setConnectionError(false)
    } catch {
      setConnectionError(true)
    } finally {
      refreshInFlight.current = false
    }
  }, [event.eventKey])

  useEffect(() => {
    const interval = window.setInterval(refresh, 5_000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    const onUpdated = () => void refresh()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("quorum-updated", onUpdated)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("quorum-updated", onUpdated)
    }
  }, [refresh])

  const progress = useMemo(
    () => Math.min(100, Math.round((summary.voting / Math.max(summary.target, 1)) * 100)),
    [summary.target, summary.voting],
  )
  const eventDate = new Date(`${event.eventDate}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  return (
    <div className="min-h-[80vh] bg-[linear-gradient(180deg,_hsl(var(--primary)/0.07),_transparent_34rem)] pb-16">
      <section className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={summary.status === "open" ? "default" : "secondary"} className="gap-1.5">
                {summary.status === "open" ? <Radio className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                {summary.status === "open" ? "Live" : "Final"}
              </Badge>
              {connectionError && <Badge variant="outline">Reconnecting…</Badge>}
            </div>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">{event.title}</h1>
            <p className="mt-4 text-lg text-muted-foreground">{eventDate}</p>
          </div>
          {summary.status === "open" && <Button asChild variant="outline"><Link href={`/quorum/${event.eventKey}`}>Open check-in form</Link></Button>}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`overflow-hidden rounded-3xl border shadow-2xl ${summary.quorumMet ? "border-emerald-500/30 shadow-emerald-500/10" : "border-primary/15 shadow-primary/10"}`}>
          <div className={`px-6 py-5 sm:px-8 ${summary.quorumMet ? "bg-emerald-600 text-white" : "bg-primary text-primary-foreground"}`}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><Vote className="h-5 w-5" /></div>
                <div><p className="text-sm font-medium opacity-80">Quorum status</p><p className="text-xl font-semibold">{summary.quorumMet ? "Quorum has been met" : `${Math.max(summary.target - summary.voting, 0)} more voting member${summary.target - summary.voting === 1 ? "" : "s"} needed`}</p></div>
              </div>
              <div className="text-sm opacity-80"><Clock3 className="mr-1.5 inline h-4 w-4" />Updated {new Date(summary.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</div>
            </div>
          </div>

          <div className="bg-card p-6 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">Voting members present</p>
                <div className="mt-2 flex items-end gap-4"><span className="text-8xl font-bold tabular-nums tracking-tighter sm:text-9xl">{summary.voting}</span><span className="pb-4 text-xl text-muted-foreground">of {summary.target} required</span></div>
                <div className="mt-7 h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all duration-700 ${summary.quorumMet ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${progress}%` }} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Metric icon={Users} label="Non-voting" value={summary.nonVoting} />
                <Metric icon={Users} label="Total present" value={summary.total} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {summary.status === "open" && <QuorumAdminPanel eventKey={event.eventKey} />}
    </div>
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return <div className="rounded-2xl border bg-muted/20 p-5"><Icon className="h-5 w-5 text-primary" /><p className="mt-5 text-4xl font-bold tabular-nums">{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>
}

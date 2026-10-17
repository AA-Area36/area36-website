"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { CheckCircle2, Radio, Vote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PublicBallot, PublicElection, PublicOffice } from "@/lib/elections/public"

const statusLabels: Record<PublicOffice["status"], string> = {
  setup: "Awaiting candidates", balloting: "Ballot in progress", motion: "Fifth-ballot motion",
  hat: "Drawing from the hat", elected: "Elected",
}

export function PublicElectionDisplay({ initialElection }: { initialElection: PublicElection }) {
  const [election, setElection] = useState<PublicElection | null>(initialElection)
  const [connectionError, setConnectionError] = useState(false)
  const [selection, setSelection] = useState<{ office: number | null; ballot: number | null }>({ office: null, ballot: null })
  const controller = useRef<AbortController | null>(null)

  const refresh = useCallback(async () => {
    if (document.hidden || controller.current) return
    const request = new AbortController()
    controller.current = request
    let timedOut = false
    const timeout = window.setTimeout(() => { timedOut = true; request.abort() }, 10_000)
    try {
      const response = await fetch(`/api/elections/${initialElection.id}/display`, { cache: "no-store", signal: request.signal })
      if (request.signal.aborted) return
      if (response.status === 404) { setElection(null); setConnectionError(false); return }
      if (!response.ok) throw new Error("Display unavailable")
      const fresh = await response.json() as PublicElection
      if (request.signal.aborted) return
      setElection(previous => previous && fresh.revision < previous.revision ? previous : fresh)
      setConnectionError(false)
    } catch {
      if (!request.signal.aborted || timedOut) setConnectionError(true)
    } finally {
      window.clearTimeout(timeout)
      if (controller.current === request) controller.current = null
    }
  }, [initialElection.id])

  useEffect(() => {
    const interval = window.setInterval(() => void refresh(), 3_000)
    const onVisible = () => { if (!document.hidden) void refresh() }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
      controller.current?.abort()
    }
  }, [refresh])

  if (!election) return <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background p-6"><div className="max-w-lg text-center"><Vote className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-6 font-serif text-4xl">Display is not available</h1><p className="mt-4 text-muted-foreground">The teller has stopped sharing this election. This page will reconnect if sharing resumes.</p><Button variant="outline" className="mt-6" onClick={() => void refresh()}>Check again</Button></div></main>

  const officeIndex = selection.office ?? election.officeIndex
  const office = election.offices[officeIndex] ?? election.offices[0]
  const ballot = office.ballots.find(item => item.number === selection.ballot)
    ?? office.ballots.find(item => item.phase === "counting")
    ?? office.ballots.findLast(item => item.phase === "recorded")
    ?? office.ballots.at(-1)
  const updated = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" }).format(new Date(election.updatedAt))

  return <main id="main-content" tabIndex={-1} className="min-h-screen bg-[linear-gradient(150deg,hsl(var(--primary)/0.08),transparent_45%)] px-4 py-6 sm:px-8 lg:px-12">
    <div className="mx-auto max-w-7xl space-y-7 sm:space-y-9">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-5">
        <Link href="/" className="flex items-center gap-2 font-semibold"><Vote className="h-5 w-5 text-primary" />Area 36<span className="ml-2 border-l pl-3 text-sm font-normal text-muted-foreground">Third Legacy elections</span></Link>
        <div role="status" className="text-right text-xs text-muted-foreground"><span className={cn("inline-flex items-center gap-2", connectionError ? "text-amber-700 dark:text-amber-300" : "text-primary")}><Radio className="h-3.5 w-3.5" />{connectionError ? "Updates paused · showing last saved totals" : "Live · refreshes automatically"}</span><p className="mt-1">Last saved {updated}</p></div>
      </header>
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Public election display · {election.date}</p><h1 className="mt-3 max-w-4xl font-serif text-4xl leading-tight tracking-tight sm:text-5xl lg:text-6xl">{election.title}</h1><p className="mt-3 text-sm text-muted-foreground">Saved tallies from the tellers. Votes are entered through the assembly’s voting process.</p></div>
        {selection.office !== null ? <Button variant="outline" onClick={() => setSelection({ office: null, ballot: null })}><Radio className="h-4 w-4" />Follow live office</Button> : <p className="shrink-0 text-sm text-primary">Following the teller’s display</p>}
      </section>
      <nav aria-label="Election offices" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {election.offices.map((item, index) => <button type="button" key={item.name} aria-pressed={index === officeIndex} onClick={() => setSelection({ office: index, ballot: null })} className={cn("rounded-lg border px-4 py-3 text-left transition-colors", index === officeIndex ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}><span className="block font-medium">{item.name}</span><span className="mt-1 block text-xs opacity-70">{item.needsReview ? "Under review" : statusLabels[item.status]}</span></button>)}
      </nav>
      <section aria-labelledby="public-office-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Office {officeIndex + 1} of {election.offices.length}</p><h2 id="public-office-heading" className="mt-1 font-serif text-3xl sm:text-4xl">{office.name}</h2></div>{ballot && <div className="space-y-1"><label htmlFor="display-ballot" className="block text-xs text-muted-foreground">View ballot</label><select id="display-ballot" value={ballot.number} onChange={event => setSelection({ office: officeIndex, ballot: Number(event.target.value) })} className="h-10 rounded-md border bg-background px-3 text-sm">{office.ballots.map(item => <option key={item.number} value={item.number}>Ballot {item.number} · {item.phase === "counting" ? "Counting" : item.phase === "archived" ? "Archived" : "Recorded"}</option>)}</select></div>}</div>
        {office.needsReview ? <p role="status" className="rounded-lg border border-amber-500/40 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-100">The tellers are reviewing affected ballots. Counts and candidate eligibility may change.</p> : office.winner ? <div className="rounded-xl border border-emerald-500/40 bg-emerald-50 p-6 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"><p className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-5 w-5" />{office.electionMethod === "hat" ? "Elected from the hat" : "Elected"}</p><p className="mt-2 font-serif text-4xl">{office.winner}</p></div> : office.status === "motion" || office.status === "hat" ? <p className="rounded-lg border bg-card p-4 text-sm">{office.status === "motion" ? "The assembly is deciding whether to take a fifth ballot." : "The teller is drawing the winning name from the hat."}</p> : null}
        {ballot ? <BallotVisual ballot={ballot} /> : <div className="rounded-xl border border-dashed bg-card px-6 py-16 text-center"><Vote className="mx-auto h-8 w-8 text-primary" /><h3 className="mt-4 font-serif text-2xl">Waiting for the candidates</h3><p className="mt-2 text-sm text-muted-foreground">The tally will appear here when the tellers prepare this office.</p></div>}
      </section>
      <footer className="flex flex-wrap justify-between gap-3 border-t pt-5 text-xs text-muted-foreground"><p>Read-only display · Updates as the tellers save counts</p><p>{election.offices.filter(item => item.status === "elected").length} of {election.offices.length} offices elected</p></footer>
    </div>
  </main>
}

function BallotVisual({ ballot }: { ballot: PublicBallot }) {
  return <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
    <div className="grid gap-5 border-b bg-muted/30 p-5 sm:grid-cols-3 sm:p-7">
      <Metric label="Recorded / expected" value={`${ballot.recorded} / ${ballot.expected ?? "—"}`} />
      <Metric label="Two-thirds needed to elect" value={ballot.recorded ? String(ballot.threshold) : "—"} />
      <div><p className="text-xs uppercase tracking-wider text-muted-foreground">Ballot {ballot.number}</p><p className="mt-2 font-serif text-2xl">{ballot.phase === "counting" ? "Counting in progress" : ballot.phase === "archived" ? "Archived after correction" : "Recorded by the tellers"}</p></div>
    </div>
    {ballot.difference !== null && ballot.difference !== 0 && <p className="border-b bg-amber-50 px-5 py-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">{Math.abs(ballot.difference)} {Math.abs(ballot.difference) === 1 ? "vote" : "votes"} {ballot.difference < 0 ? "under" : "over"} expected. Percentages use the recorded total.</p>}
    <div className="space-y-7 p-5 sm:p-7">
      <p className="text-xs text-muted-foreground">Vote share · the marker shows the two-thirds threshold</p>
      {ballot.candidates.map(candidate => <VoteBar key={candidate.id} name={candidate.name} inPerson={candidate.inPerson} online={candidate.online} total={candidate.total} share={candidate.share} />)}
      <div className="border-t pt-6"><VoteBar name="X / no candidate" {...ballot.noCandidate} isX /><p className="mt-2 text-xs text-muted-foreground">Included in percentages and the election threshold; cannot be elected.</p></div>
    </div>
  </div>
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 font-mono text-3xl tabular-nums sm:text-4xl">{value}</p></div>
}

function VoteBar({ name, inPerson, online, total, share, isX = false }: { name: string; inPerson: number; online: number; total: number; share: number; isX?: boolean }) {
  const percentage = (share * 100).toFixed(1)
  return <div>
    <div className="mb-2 flex items-end justify-between gap-4"><div className="min-w-0"><h3 className="break-words text-lg font-medium sm:text-xl">{name}</h3><p className="mt-1 text-xs text-muted-foreground">{inPerson} in person · {online} online</p></div><p className="shrink-0 font-mono text-2xl tabular-nums sm:text-3xl">{total}<span className="ml-3 text-sm text-muted-foreground sm:text-base">{percentage}%</span></p></div>
    <div role="meter" aria-label={`${name} vote share`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share * 100} aria-valuetext={`${total} votes, ${percentage} percent`} className="relative h-5 rounded bg-muted sm:h-6"><div className={cn("h-full rounded motion-safe:transition-[width] motion-safe:duration-500", isX ? "bg-amber-600 dark:bg-amber-400" : "bg-primary")} style={{ width: `${share * 100}%` }} /><span aria-hidden="true" className="absolute -bottom-1 -top-1 w-0.5 bg-foreground/70" style={{ left: `${200 / 3}%` }} /></div>
  </div>
}

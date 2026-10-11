"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Cloud, ExternalLink, Monitor, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { OFFICE_NAMES, PROCEDURE_URL, reviewOffice, type ElectionCommand, type ElectionRecord } from "@/lib/elections/model"
import { getElectionAction, retryElectionSyncAction, saveElectionAction } from "./actions"

import { CandidateSetup, TallyForm, HatResult, BallotHistory } from "./election-forms"

type CommandSender = (command: ElectionCommand) => Promise<boolean>
type SaveRequest = { id: string; revision: number; commandId: string; command: ElectionCommand }

export function ElectionWorkspace({ initialElection, canWrite }: { initialElection: ElectionRecord; canWrite: boolean }) {
  const [election, setElection] = useState(initialElection)
  const [officeIndex, setOfficeIndex] = useState(0)
  const [presentation, setPresentation] = useState(false)
  const [editingCandidates, setEditingCandidates] = useState<number | null>(null)
  const [pending, setPending] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [retryable, setRetryable] = useState(false)
  const [dirty, setDirty] = useState(false)
  const current = useRef(initialElection)
  const queue = useRef(Promise.resolve(true))
  const failed = useRef<SaveRequest | null>(null)
  const blockedRef = useRef(false)

  const execute = useCallback(async (request: SaveRequest) => {
    try {
      const result = await saveElectionAction(request)
      if (!result.success) {
        setError(result.error)
        if (result.conflict) { blockedRef.current = true; setBlocked(true); setRetryable(false) }
        else if (result.error.startsWith("Save could not be confirmed")) { failed.current = request; blockedRef.current = true; setBlocked(true); setRetryable(true) }
        return false
      }
      current.current = result.election
      setElection(result.election)
      setError(null)
      failed.current = null
      blockedRef.current = false
      setBlocked(false)
      setRetryable(false)
      if (request.command.type !== "draft") setDirty(false)
      return true
    } catch {
      failed.current = request
      blockedRef.current = true
      setBlocked(true)
      setRetryable(true)
      setError("Save could not be confirmed. Keep this page open and retry the save.")
      return false
    }
  }, [])

  const send = useCallback<CommandSender>(command => {
    setPending(count => count + 1)
    const operation = queue.current.then(async () => {
      if (blockedRef.current) return false
      return execute({ id: initialElection.id, revision: current.current.revision, commandId: crypto.randomUUID(), command })
    }).finally(() => setPending(count => count - 1))
    queue.current = operation
    return operation
  }, [execute, initialElection.id])

  useEffect(() => {
    if (election.syncedRevision >= election.revision || election.syncError || blocked) return
    let disposed = false
    const timer = setInterval(async () => {
      try {
        const fresh = await getElectionAction(initialElection.id)
        if (disposed || !fresh) return
        if (fresh.revision > current.current.revision && pending === 0) {
          blockedRef.current = true; setBlocked(true)
          setRetryable(false)
          setError("This election changed in another tab. Reload before entering more totals.")
          return
        }
        // Polling updates sync metadata only; it cannot replace local inputs.
        setElection(previous => ({ ...previous, spreadsheetId: fresh.spreadsheetId, syncedRevision: fresh.syncedRevision, syncError: fresh.syncError }))
      } catch { /* Votes remain saved; an operator can explicitly retry sync. */ }
    }, 3000)
    return () => { disposed = true; clearInterval(timer) }
  }, [initialElection.id, election.revision, election.syncedRevision, election.syncError, blocked, pending])

  useEffect(() => {
    if (!dirty && pending === 0 && !failed.current) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = "" }
    const guardNavigation = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a") : null
      if (!anchor || anchor.target === "_blank" || !anchor.href.startsWith(window.location.origin)) return
      event.preventDefault()
      event.stopPropagation()
      setError("Wait for your changes to save before leaving this election.")
    }
    window.addEventListener("beforeunload", warn)
    document.addEventListener("click", guardNavigation, true)
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", guardNavigation, true) }
  }, [dirty, pending, blocked])

  const office = election.state.offices[officeIndex]
  const review = reviewOffice(office)
  const winner = office.candidates.find(candidate => candidate.id === office.winnerId)
  const synced = election.syncedRevision >= election.revision
  const completed = election.state.offices.filter(candidate => candidate.status === "elected").length
  return <div className={cn("election-workspace space-y-6", presentation && "election-presentation")}>
    <div className="election-controls flex flex-wrap items-center justify-between gap-3"><Link href="/admin/elections" className="flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />All elections</Link><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" />Print results</Button><Button variant={presentation ? "default" : "outline"} size="sm" onClick={() => setPresentation(value => !value)} disabled={dirty || pending > 0}><Monitor className="h-4 w-4" />{presentation ? "Exit display" : "Meeting display"}</Button></div></div>
    <header className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Third Legacy · {election.state.date}</p><h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{election.state.title}</h1></div><div className="election-controls text-sm"><p role="status" className={cn("flex items-center gap-2", dirty || pending ? "text-amber-800 dark:text-amber-300" : "text-muted-foreground")}><Cloud className="h-4 w-4" />{pending ? "Saving changes…" : dirty ? "Unsaved changes" : synced ? "Saved to Google Sheets" : election.syncError ? "Votes saved · Drive sync needs attention" : "Votes saved · Syncing to Google Sheets…"}</p>{election.spreadsheetId && <a className="mt-2 flex items-center justify-end gap-1 text-primary" target="_blank" rel="noreferrer" href={`https://docs.google.com/spreadsheets/d/${election.spreadsheetId}/edit`}>Open election sheet<ExternalLink className="h-3 w-3" /></a>}</div></header>
    {error && <div role="alert" className="election-controls rounded-lg border border-destructive/40 bg-destructive/5 p-4"><p>{error}</p><div className="mt-3 flex gap-2">{blocked && retryable ? <Button size="sm" onClick={async () => { const request = failed.current; if (request) { setPending(count => count + 1); try { await execute(request) } finally { setPending(count => count - 1) } } }} disabled={pending > 0}>Retry save</Button> : blocked ? <Button size="sm" onClick={() => window.location.reload()}>Reload election</Button> : null}</div></div>}
    {election.syncError && <div role="status" className="election-controls flex flex-col justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center"><p>{election.syncError} <Link className="underline" href="/admin/elections">Drive connection</Link></p>{canWrite && <Button variant="outline" size="sm" onClick={async () => { try { const fresh = await retryElectionSyncAction(election.id); if (fresh) setElection(previous => ({ ...previous, spreadsheetId: fresh.spreadsheetId, syncedRevision: fresh.syncedRevision, syncError: fresh.syncError })) } catch { setError("Drive sync is unavailable. Your saved votes remain here.") } }}>Retry Drive sync</Button>}</div>}
    <nav aria-label="Election offices" className="election-controls grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{OFFICE_NAMES.map((name, index) => <button key={name} type="button" aria-pressed={officeIndex === index} onClick={() => { setOfficeIndex(index); setEditingCandidates(null); setDirty(false) }} disabled={dirty || pending > 0} className={cn("flex items-center justify-between gap-2 rounded-lg border px-3 py-3 text-left text-sm font-medium transition-colors disabled:opacity-50", officeIndex === index ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50")}><span>{name}</span>{election.state.offices[index].status === "elected" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="text-xs opacity-60">{String(index + 1).padStart(2, "0")}</span>}</button>)}</nav>
    <div className={cn("grid gap-6", !presentation && "lg:grid-cols-[minmax(0,1fr)_280px]")}>
      <section className="min-w-0 space-y-5" aria-labelledby="office-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-xs uppercase tracking-widest text-muted-foreground">Office {officeIndex + 1} of 6</p><h2 id="office-heading" className="font-serif text-3xl">{office.name}</h2></div><span className="rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">{office.status === "setup" ? "Candidate setup" : office.status === "elected" ? "Election complete" : office.status === "motion" ? "Fifth-ballot motion" : office.status === "hat" ? "Going to the hat" : `Ballot ${office.ballots.length + 1} of 5`}</span></div>
        {office.status !== "setup" && <ol className="flex gap-2" aria-label="Ballot progress">{[1, 2, 3, 4, 5].map(number => <li key={number} className={cn("flex flex-1 items-center justify-center gap-1 rounded-md border py-2 text-xs", number <= office.ballots.length ? "border-primary/20 bg-primary/10 text-primary" : number === office.ballots.length + 1 && office.status === "balloting" ? "border-primary font-semibold text-primary" : "text-muted-foreground")} aria-current={number === office.ballots.length + 1 && office.status === "balloting" ? "step" : undefined}>{number <= office.ballots.length && <Check className="h-3 w-3" />}Ballot {number}</li>)}</ol>}
        {review.issues.length ? <div role="alert" className="rounded-xl border border-amber-500 bg-amber-50 p-5 text-amber-950 dark:bg-amber-950 dark:text-amber-100"><h3 className="font-semibold">Review affected ballots</h3><p className="mt-2 text-sm">A correction changed the candidate list for ballots {review.issues.map(issue => issue.ballotNumber).join(", ")}. All later totals are retained. Use the correction button on each affected ballot before continuing.</p></div> : office.status === "setup" || editingCandidates === officeIndex ? <CandidateSetup key={`${officeIndex}-${editingCandidates}`} initialNames={office.candidates.map(candidate => candidate.name)} onDirty={setDirty} onCommand={async command => { const saved = await send(command); if (saved) setEditingCandidates(null); return saved }} onCancel={editingCandidates === officeIndex ? () => { setEditingCandidates(null); setDirty(false) } : undefined} officeIndex={officeIndex} disabled={!canWrite || blocked || pending > 0} /> : office.status === "balloting" ? <TallyForm key={`${officeIndex}-${office.ballots.length}-${office.eligibleIds.join(",")}`} office={office} officeIndex={officeIndex} expectedDefault={election.state.expectedVotes} onCommand={send} onDirty={setDirty} disabled={!canWrite || blocked} presentation={presentation} /> : office.status === "motion" ? <div className="rounded-xl border bg-card p-6"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Chairperson’s next step</p><h3 className="mt-3 font-serif text-2xl">Will the assembly take a fifth ballot?</h3><p className="mt-3 leading-relaxed text-muted-foreground">Ask for a motion, a second, and a simple majority of hands. Record the assembly’s decision.</p><div className="election-controls mt-6 flex flex-wrap gap-3"><Button disabled={!canWrite || blocked || pending > 0} onClick={() => send({ type: "motion", officeIndex, approved: true })}>Motion carried<ArrowRight className="h-4 w-4" /></Button><Button variant="outline" disabled={!canWrite || blocked || pending > 0} onClick={() => send({ type: "motion", officeIndex, approved: false })}>Motion defeated · Go to hat</Button></div></div> : office.status === "hat" ? <HatResult office={office} officeIndex={officeIndex} onCommand={send} disabled={!canWrite || blocked || pending > 0} presentation={presentation} /> : <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 p-8 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"><CheckCircle2 className="h-7 w-7" /><p className="mt-5 text-sm uppercase tracking-widest">Elected {office.electionMethod === "hat" ? "from the hat" : `on ballot ${review.winningBallot ?? office.ballots.length}`}</p><h3 className="mt-3 font-serif text-4xl sm:text-5xl">{winner?.name}</h3><p className="mt-3">{office.name}</p>{officeIndex < 5 && <Button className="election-controls mt-6" onClick={() => setOfficeIndex(officeIndex + 1)}>Next office<ArrowRight className="h-4 w-4" /></Button>}</div>}
        {canWrite && office.status === "balloting" && office.ballots.length === 0 && editingCandidates === null && !presentation && <Button className="election-controls" variant="ghost" size="sm" disabled={blocked || pending > 0 || dirty} onClick={() => setEditingCandidates(officeIndex)}>Edit candidates</Button>}
        {review.archivedBallots.length > 0 && <p className="text-sm text-muted-foreground">Ballots {review.archivedBallots.join(", ")} are retained as records from before the corrected election outcome.</p>}
        {office.ballots.length > 0 && <BallotHistory office={office} expanded={presentation} officeIndex={officeIndex} onCommand={send} onDirty={setDirty} canCorrect={canWrite && !presentation} disabled={blocked || pending > 0} canOpen={!dirty} />}
      </section>
      {!presentation && <aside className="election-controls space-y-5"><div className="rounded-xl border bg-card p-5"><h2 className="text-sm font-semibold">Third Legacy procedure</h2><ol className="mt-4 space-y-4 text-sm text-muted-foreground"><li><strong className="text-foreground">Every ballot</strong><p className="mt-1">Two-thirds of the votes elects a candidate.</p></li><li><strong className="text-foreground">After ballot 2</strong><p className="mt-1">Withdraw candidates below one-fifth, protecting the top two and ties.</p></li><li><strong className="text-foreground">After ballot 3</strong><p className="mt-1">Withdraw candidates below one-third, protecting the top two and ties.</p></li><li><strong className="text-foreground">After ballot 4</strong><p className="mt-1">Withdraw the lowest totals, protecting the top two and ties. Decide on a fifth ballot.</p></li><li><strong className="text-foreground">After ballot 5</strong><p className="mt-1">If no one is elected, draw from the hat among the top two, preserving ties.</p></li></ol><a href={PROCEDURE_URL} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-1 text-sm text-primary underline underline-offset-4">Read Appendix G<ExternalLink className="h-3 w-3" /></a></div><p className="text-center text-xs text-muted-foreground">{completed} of 6 offices elected</p></aside>}
    </div>
    <section className="election-print-summary hidden"><h2>Election results</h2>{election.state.offices.map(item => <p key={item.name}>{item.name}: {item.candidates.find(candidate => candidate.id === item.winnerId)?.name ?? "Not yet elected"}{item.electionMethod ? ` (${item.electionMethod})` : ""}</p>)}</section>
  </div>
}

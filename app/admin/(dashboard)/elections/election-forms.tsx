"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, ChevronDown, Minus, Plus, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { assessBallot, emptyChannels, MAX_CANDIDATES, OFFICE_NAMES, reviewOffice, type Ballot, type ElectionCommand, type Office } from "@/lib/elections/model"

type CommandSender = (command: ElectionCommand) => Promise<boolean>
type Channel = "inPerson" | "online"
type Inputs = { candidateId: string; inPerson: string; online: string }[]
const integer = (value: string, min = 0) => /^\d+$/.test(value) && Number(value) >= min && Number(value) <= 100_000
const parseVotes = (inputs: Inputs) => inputs.map(vote => ({ candidateId: vote.candidateId, inPerson: Number(vote.inPerson) || 0, online: Number(vote.online) || 0 }))
const channelName = (channel: Channel) => channel === "inPerson" ? "In person" : "Online"

export function CountInput({ id, label, value, onChange, disabled, min = 0 }: { id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean; min?: number }) {
  return <div className="election-count flex items-center rounded-md border bg-background">
    <Button type="button" variant="ghost" size="icon" className="h-10 w-9 shrink-0 rounded-r-none" aria-label={`Decrease ${label.toLowerCase()} by one`} disabled={disabled || !integer(value, min) || Number(value) <= min} onClick={() => onChange(String(Number(value) - 1))}><Minus className="h-4 w-4" /></Button>
    <Input id={id} aria-label={label} type="number" inputMode="numeric" min={min} max={100_000} step={1} value={value} onChange={event => onChange(event.target.value)} onFocus={event => event.target.select()} disabled={disabled} aria-invalid={value !== "" && !integer(value, min)} className="h-10 min-w-0 rounded-none border-0 px-1 text-center font-mono tabular-nums shadow-none" />
    <Button type="button" variant="ghost" size="icon" className="h-10 w-9 shrink-0 rounded-l-none" aria-label={`Increase ${label.toLowerCase()} by one`} disabled={disabled || Number(value) >= 100_000 || (value !== "" && !integer(value, min))} onClick={() => onChange(String(value === "" ? Math.max(1, min) : Number(value) + 1))}><Plus className="h-4 w-4" /></Button>
  </div>
}

export function CandidateSetup({ officeIndex, initialNames, onCommand, onDirty, onCancel, disabled }: { officeIndex: number; initialNames: string[]; onCommand: CommandSender; onDirty: (dirty: boolean) => void; onCancel?: () => void; disabled: boolean }) {
  const initial = initialNames.length ? initialNames : ["", ""]
  const [rows, setRows] = useState(() => initial.map((value, key) => ({ key, value })))
  const [busy, setBusy] = useState(false)
  const sequence = useRef(initial.length)
  const names = rows.map(row => row.value.trim())
  const duplicate = new Set(names.filter(Boolean).map(name => name.toLowerCase())).size !== names.filter(Boolean).length
  const update = (next: typeof rows) => { setRows(next); onDirty(initialNames.length === 0 ? next.some(row => row.value.trim() !== "") : JSON.stringify(next.map(row => row.value)) !== JSON.stringify(initial)) }
  return <form className="rounded-xl border bg-card p-6" onSubmit={async event => { event.preventDefault(); setBusy(true); try { await onCommand({ type: "candidates", officeIndex, names }) } finally { setBusy(false) } }}>
    <h3 className="font-serif text-2xl">Who is standing for {OFFICE_NAMES[officeIndex]}?</h3>
    <p className="mt-2 text-sm text-muted-foreground">Give each candidate their own name field.{onCancel ? " Saving candidates resets draft totals for ballot 1." : ""}</p>
    <div className="mt-5 space-y-4">{rows.map((row, index) => <div key={row.key} className="space-y-2"><Label htmlFor={`candidate-${row.key}`}>Candidate {index + 1} name</Label><div className="flex gap-2"><Input id={`candidate-${row.key}`} value={row.value} onChange={event => update(rows.map(candidate => candidate.key === row.key ? { ...candidate, value: event.target.value } : candidate))} required maxLength={100} disabled={disabled || busy} autoComplete="off" /><Button type="button" variant="outline" size="icon" aria-label={`Remove candidate ${index + 1}`} disabled={disabled || busy || rows.length === 1} onClick={() => update(rows.filter(candidate => candidate.key !== row.key))}><X className="h-4 w-4" /></Button></div></div>)}</div>
    {duplicate && <p role="alert" className="mt-3 text-sm text-destructive">Candidate names must be distinct.</p>}
    <Button type="button" variant="outline" className="mt-4" disabled={disabled || busy || rows.length >= MAX_CANDIDATES} onClick={() => update([...rows, { key: sequence.current++, value: "" }])}><Plus className="h-4 w-4" />Add candidate</Button>
    <div className="mt-6 flex gap-3"><Button type="submit" disabled={disabled || busy || duplicate || names.some(name => !name)}>{busy ? "Saving candidates…" : onCancel ? "Save candidates" : "Start ballot 1"}<ArrowRight className="h-4 w-4" /></Button>{onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>}</div>
  </form>
}

function Reconciliation({ inputs, noCandidate, expected, onExpected, disabled, idPrefix = "live" }: { idPrefix?: string; inputs: Inputs; noCandidate: { inPerson: string; online: string }; expected: string; onExpected: (value: string) => void; disabled: boolean }) {
  const valid = inputs.every(vote => integer(vote.inPerson) && integer(vote.online)) && integer(noCandidate.inPerson) && integer(noCandidate.online)
  const result = assessBallot(1, parseVotes(inputs), { inPerson: Number(noCandidate.inPerson) || 0, online: Number(noCandidate.online) || 0 }, integer(expected, 1) ? Number(expected) : null)
  return <div className="grid gap-4 border-b bg-muted/30 p-5 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-end">
    <div className="space-y-2"><Label htmlFor={`${idPrefix}-expected-votes`}>Expected votes</Label><CountInput id={`${idPrefix}-expected-votes`} label="Expected votes" value={expected} onChange={onExpected} disabled={disabled} min={1} /><p className="text-xs text-muted-foreground">Carries forward to the next ballot.</p></div>
    <div role="status"><p className="text-xs uppercase tracking-wider text-muted-foreground">Recorded / expected</p><p className="mt-1 font-mono text-3xl tabular-nums">{valid ? result.recorded : "—"} <span className="text-muted-foreground">/ {result.expectedVotes ?? "—"}</span></p><p className={cn("mt-1 text-sm", result.expectedVotes === null || !valid ? "text-muted-foreground" : result.difference === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300")}>{!valid ? "Enter whole numbers in every count." : result.expectedVotes === null ? "Enter the expected number of voters." : result.difference === 0 ? "Counts align" : result.difference! < 0 ? `${Math.abs(result.difference!)} ${Math.abs(result.difference!) === 1 ? "vote" : "votes"} still to account for` : `${result.difference} more ${result.difference === 1 ? "vote" : "votes"} than expected`}</p></div>
    <div className="sm:text-right"><p className="text-sm text-muted-foreground">Two-thirds of total votes</p><p className="mt-1 font-mono text-3xl text-primary">{valid && result.total ? result.threshold : "—"}<span className="ml-2 font-sans text-sm text-muted-foreground">to elect</span></p></div>
  </div>
}

function TurnoutWarning({ difference }: { difference: number | null }) {
  if (difference === null || difference === 0) return null
  const amount = Math.abs(difference)
  return <p role="status" className="rounded-md border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950 dark:text-amber-100">Count differs: {amount} {amount === 1 ? "vote" : "votes"} {difference < 0 ? "under" : "over"} expected. Percentages and the election threshold use recorded votes.</p>
}

function VoteGrid({ office, inputs, noCandidate, update, disabled, presentation = false, idPrefix = "live" }: { idPrefix?: string; office: Office; inputs: Inputs; noCandidate: { inPerson: string; online: string }; update: (id: string, channel: Channel, value: string) => void; disabled: boolean; presentation?: boolean }) {
  const result = assessBallot(1, parseVotes(inputs), { inPerson: Number(noCandidate.inPerson) || 0, online: Number(noCandidate.online) || 0 })
  const valid = inputs.every(vote => integer(vote.inPerson) && integer(vote.online)) && integer(noCandidate.inPerson) && integer(noCandidate.online)
  const names = new Map(office.candidates.map(candidate => [candidate.id, candidate.name]))
  const rows = [...inputs, { candidateId: "no-candidate", ...noCandidate }]
  return <><div className="hidden grid-cols-[minmax(0,1fr)_140px_140px_70px_80px] gap-3 border-b px-5 py-3 text-xs uppercase tracking-wider text-muted-foreground sm:grid"><span>Candidate</span><span className="text-center">In person</span><span className="text-center">Online</span><span className="text-right">Total</span><span className="text-right">Share</span></div>{rows.map(vote => {
    const isX = vote.candidateId === "no-candidate"
    const name = isX ? "X / no candidate" : names.get(vote.candidateId) ?? "Candidate"
    const total = Number(vote.inPerson) + Number(vote.online)
    const share = isX ? result.noCandidateShare : result.rows.find(candidate => candidate.candidateId === vote.candidateId)?.share ?? 0
    return <div key={vote.candidateId} className={cn("grid grid-cols-2 items-center gap-3 border-b px-5 py-4 sm:grid-cols-[minmax(0,1fr)_140px_140px_70px_80px]", isX && "border-t-2 bg-muted/30")}><div className="col-span-2 min-w-0 sm:col-span-1"><p className="break-words font-medium">{name}</p>{isX && <p className="mt-1 text-xs text-muted-foreground">Included in total votes and percentages; cannot be elected.</p>}</div>{(["inPerson", "online"] as const).map(channel => <div key={channel}><Label htmlFor={`${idPrefix}-${vote.candidateId}-${channel}`} className="mb-1 block text-xs text-muted-foreground sm:sr-only">{channelName(channel)}</Label>{presentation ? <span className="block text-center font-mono text-xl">{vote[channel]}</span> : <CountInput id={`${idPrefix}-${vote.candidateId}-${channel}`} label={`${channelName(channel)} votes for ${name}`} value={vote[channel]} onChange={value => update(vote.candidateId, channel, value)} disabled={disabled} />}</div>)}<div className="text-right"><span className="mr-2 text-xs text-muted-foreground sm:hidden">Total</span><span className="font-mono text-lg">{valid && Number.isFinite(total) ? total : "—"}</span></div><div className="text-right"><span className="mr-2 text-xs text-muted-foreground sm:hidden">Share</span><span className="font-mono">{valid && result.total ? `${(share * 100).toFixed(1)}%` : "—"}</span></div></div>
  })}</>
}

export function TallyForm({ office, officeIndex, expectedDefault, onCommand, onDirty, disabled, presentation }: { office: Office; officeIndex: number; expectedDefault: number | null; onCommand: CommandSender; onDirty: (value: boolean) => void; disabled: boolean; presentation: boolean }) {
  const [inputs, setInputs] = useState<Inputs>(() => office.eligibleIds.map(candidateId => { const vote = office.draft.find(vote => vote.candidateId === candidateId) ?? emptyChannels(); return { candidateId, inPerson: String(vote.inPerson), online: String(vote.online) } }))
  const [noCandidate, setNoCandidate] = useState(() => ({ inPerson: String(office.draftNoCandidate.inPerson), online: String(office.draftNoCandidate.online) }))
  const [expected, setExpected] = useState(() => String(office.expectedVotes ?? expectedDefault ?? ""))
  const [dirty, setDirty] = useState(false)
  const [review, setReview] = useState(false)
  const [busy, setBusy] = useState(false)
  const version = useRef(0)
  const valid = inputs.every(vote => integer(vote.inPerson) && integer(vote.online)) && integer(noCandidate.inPerson) && integer(noCandidate.online) && (expected === "" || integer(expected, 1))
  const votes = parseVotes(inputs)
  const metrics = { expectedVotes: integer(expected, 1) ? Number(expected) : null, noCandidate: { inPerson: Number(noCandidate.inPerson) || 0, online: Number(noCandidate.online) || 0 } }
  const result = assessBallot(office.ballots.length + 1, votes, metrics.noCandidate, metrics.expectedVotes)
  const changed = () => { version.current++; setDirty(true); onDirty(true) }
  const update = (id: string, channel: Channel, value: string) => { changed(); if (id === "no-candidate") setNoCandidate(previous => ({ ...previous, [channel]: value })); else setInputs(previous => previous.map(vote => vote.candidateId === id ? { ...vote, [channel]: value } : vote)) }
  useEffect(() => {
    if (!dirty || !valid || busy || disabled) return
    const editVersion = version.current
    const timer = setTimeout(async () => {
      const saved = await onCommand({ type: "draft", officeIndex, votes: parseVotes(inputs), expectedVotes: expected === "" ? null : Number(expected), noCandidate: { inPerson: Number(noCandidate.inPerson), online: Number(noCandidate.online) } })
      if (saved && version.current === editVersion) { setDirty(false); onDirty(false) }
    }, 750)
    return () => clearTimeout(timer)
  }, [inputs, noCandidate, expected, dirty, valid, busy, disabled, officeIndex, onCommand, onDirty])
  const name = (id: string) => office.candidates.find(candidate => candidate.id === id)?.name
  return <><div className="overflow-hidden rounded-xl border bg-card"><Reconciliation inputs={inputs} noCandidate={noCandidate} expected={expected} onExpected={value => { changed(); setExpected(value) }} disabled={disabled || busy || presentation} /><VoteGrid office={office} inputs={inputs} noCandidate={noCandidate} update={update} disabled={disabled || busy} presentation={presentation} />{!presentation && <div className="election-controls flex flex-col justify-between gap-4 bg-muted/20 p-5 sm:flex-row sm:items-center"><p className="text-xs text-muted-foreground">Totals save automatically. You can record a ballot even when counts differ.</p><Button disabled={disabled || busy || !valid || result.expectedVotes === null} onClick={() => setReview(true)}>Review ballot {office.ballots.length + 1}<ArrowRight className="h-4 w-4" /></Button></div>}</div>
    <Dialog open={review} onOpenChange={value => { if (!busy) setReview(value) }}><DialogContent><DialogHeader><DialogTitle>Record ballot {office.ballots.length + 1}?</DialogTitle><DialogDescription>Check the tallies with the tellers before continuing.</DialogDescription></DialogHeader><div className="space-y-3 text-sm"><p><strong>{result.recorded}</strong> recorded votes / <strong>{result.expectedVotes}</strong> expected, including <strong>{result.noCandidateTotal}</strong> X / no candidate votes.</p><TurnoutWarning difference={result.difference} /><p>{result.total} total votes; {result.total ? result.threshold : "—"} needed to elect.</p><div className="max-h-60 space-y-2 overflow-y-auto">{result.rows.map(candidate => <p key={candidate.candidateId} className="flex justify-between gap-4 border-b pb-2"><span>{name(candidate.candidateId)}</span><span className="shrink-0 font-mono">{candidate.inPerson} + {candidate.online} = {candidate.total}</span></p>)}</div>{result.winnerId ? <p className="font-medium text-emerald-700 dark:text-emerald-300">{name(result.winnerId)} will be recorded as elected.</p> : <><p>{result.withdrawnIds.length ? `Withdrawn: ${result.withdrawnIds.map(name).join(", ")}` : "All candidates remain."}</p><p className="font-medium">{office.ballots.length === 3 ? "Next: the assembly decides on a fifth ballot." : office.ballots.length === 4 ? "Next: the teller draws from the hat." : `Next: ballot ${office.ballots.length + 2}.`}</p></>}</div><DialogFooter><Button variant="outline" onClick={() => setReview(false)} disabled={busy}>Return to totals</Button><Button disabled={busy} onClick={async () => { setBusy(true); try { if (await onCommand({ type: "finalize", officeIndex, votes, ...metrics })) { onDirty(false); setDirty(false); setReview(false) } } finally { setBusy(false) } }}>{busy ? "Recording…" : "Record ballot"}<Check className="h-4 w-4" /></Button></DialogFooter></DialogContent></Dialog>
  </>
}

export function HatResult({ office, officeIndex, onCommand, disabled, presentation }: { office: Office; officeIndex: number; onCommand: CommandSender; disabled: boolean; presentation: boolean }) {
  const [candidateId, setCandidateId] = useState("")
  const [review, setReview] = useState(false)
  return <div className="rounded-xl border bg-card p-6"><h3 className="font-serif text-3xl">Go to the hat.</h3><p className="mt-3 text-sm text-muted-foreground">Prepare one lot for each remaining candidate. The teller draws the winning name, then records it below.</p><ul className="mt-5 space-y-2">{office.candidates.filter(candidate => office.eligibleIds.includes(candidate.id)).map(candidate => <li key={candidate.id} className="rounded-md border bg-muted/30 px-4 py-3 font-medium">{candidate.name}</li>)}</ul>{!presentation && <div className="election-controls mt-6 space-y-3"><Label htmlFor="hat-winner">Name drawn by the teller</Label><select id="hat-winner" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={candidateId} onChange={event => setCandidateId(event.target.value)} disabled={disabled}><option value="">Select the name drawn</option>{office.candidates.filter(candidate => office.eligibleIds.includes(candidate.id)).map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}</select><Button disabled={disabled || !candidateId} onClick={() => setReview(true)}>Record hat result</Button></div>}<Dialog open={review} onOpenChange={setReview}><DialogContent><DialogHeader><DialogTitle>Confirm the name drawn</DialogTitle><DialogDescription>{office.candidates.find(candidate => candidate.id === candidateId)?.name} will be recorded as elected {office.name} from the hat.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setReview(false)}>Cancel</Button><Button disabled={disabled} onClick={async () => { if (await onCommand({ type: "hat", officeIndex, candidateId })) setReview(false) }}>Confirm result</Button></DialogFooter></DialogContent></Dialog></div>
}

function CorrectionEditor({ office, ballot, officeIndex, onCommand, onDirty, disabled, close }: { office: Office; ballot: Ballot; officeIndex: number; onCommand: CommandSender; onDirty: (dirty: boolean) => void; disabled: boolean; close: () => void }) {
  const eligibleIds = reviewOffice(office).eligibleByBallot[ballot.number]
  const [inputs, setInputs] = useState<Inputs>(() => eligibleIds.map(candidateId => { const vote = ballot.votes.find(vote => vote.candidateId === candidateId) ?? emptyChannels(); return { candidateId, inPerson: String(vote.inPerson), online: String(vote.online) } }))
  const [noCandidate, setNoCandidate] = useState(() => ({ inPerson: String(ballot.noCandidate.inPerson), online: String(ballot.noCandidate.online) }))
  const [expected, setExpected] = useState(() => String(ballot.expectedVotes ?? assessBallot(ballot.number, ballot.votes, ballot.noCandidate).recorded))
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const valid = inputs.every(vote => integer(vote.inPerson) && integer(vote.online)) && integer(noCandidate.inPerson) && integer(noCandidate.online) && integer(expected, 1)
  const excluded = ballot.votes.filter(vote => !eligibleIds.includes(vote.candidateId))
  const update = (id: string, channel: Channel, value: string) => { onDirty(true); if (id === "no-candidate") setNoCandidate(previous => ({ ...previous, [channel]: value })); else setInputs(previous => previous.map(vote => vote.candidateId === id ? { ...vote, [channel]: value } : vote)) }
  return <><DialogHeader><DialogTitle>Correct ballot {ballot.number}</DialogTitle><DialogDescription>Edit this ballot directly. Later ballots, current draft counts, and other offices stay saved.</DialogDescription></DialogHeader>{excluded.length > 0 && <p className="text-sm text-amber-800 dark:text-amber-300">The corrected candidate list excludes {excluded.map(vote => office.candidates.find(candidate => candidate.id === vote.candidateId)?.name).join(", ")}. Original counts remain in the audit history.</p>}<div className="overflow-hidden rounded-xl border"><Reconciliation idPrefix={`correct-${ballot.number}`} inputs={inputs} noCandidate={noCandidate} expected={expected} onExpected={value => { onDirty(true); setExpected(value) }} disabled={disabled || busy} /><VoteGrid idPrefix={`correct-${ballot.number}`} office={office} inputs={inputs} noCandidate={noCandidate} update={update} disabled={disabled || busy} /></div><div className="space-y-2"><Label htmlFor="correction-reason">Reason for correction</Label><Textarea id="correction-reason" value={reason} onChange={event => { onDirty(true); setReason(event.target.value) }} maxLength={500} disabled={disabled || busy} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button variant="outline" onClick={close} disabled={busy}>Cancel</Button><Button disabled={disabled || busy || !valid || reason.trim().length < 5} onClick={async () => { setBusy(true); setError(null); try { if (await onCommand({ type: "correct", officeIndex, ballotNumber: ballot.number, votes: parseVotes(inputs), expectedVotes: Number(expected), noCandidate: { inPerson: Number(noCandidate.inPerson), online: Number(noCandidate.online) }, reason })) close(); else setError("Correction was not saved. Close this dialog to see the save message.") } finally { setBusy(false) } }}>{busy ? "Saving correction…" : "Save correction"}</Button></DialogFooter></>
}

function Correction({ office, ballot, officeIndex, onCommand, onDirty, disabled, canOpen }: { office: Office; ballot: Ballot; officeIndex: number; onCommand: CommandSender; onDirty: (dirty: boolean) => void; disabled: boolean; canOpen: boolean }) {
  const [open, setOpen] = useState(false)
  const close = () => { setOpen(false); onDirty(false) }
  return <><Button variant="ghost" size="sm" disabled={disabled || !canOpen} onClick={() => setOpen(true)}><RotateCcw className="h-3 w-3" />Correct ballot {ballot.number}</Button><Dialog open={open} onOpenChange={value => { if (!disabled) { setOpen(value); if (!value) onDirty(false) } }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">{open && <CorrectionEditor office={office} ballot={ballot} officeIndex={officeIndex} onCommand={onCommand} onDirty={onDirty} disabled={disabled} close={close} />}</DialogContent></Dialog></>
}

export function BallotHistory({ office, expanded, officeIndex, onCommand, onDirty, canCorrect, disabled, canOpen }: { office: Office; expanded: boolean; officeIndex: number; onCommand: CommandSender; onDirty: (dirty: boolean) => void; canCorrect: boolean; disabled: boolean; canOpen: boolean }) {
  const review = reviewOffice(office)
  return <div className="space-y-3"><h3 className="text-sm font-semibold">Recorded ballots</h3>{office.ballots.map(ballot => {
    const result = assessBallot(ballot.number, ballot.votes, ballot.noCandidate, ballot.expectedVotes)
    const issue = review.issues.find(issue => issue.ballotNumber === ballot.number)
    return <div key={ballot.number} className={cn("rounded-lg border bg-card", issue && "border-amber-500")}><details open={expanded || undefined}><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm"><span className="font-medium">Ballot {ballot.number}{issue ? " · Review needed" : review.archivedBallots.includes(ballot.number) ? " · Archived after correction" : result.difference !== null && result.difference !== 0 ? " · Count differs" : ""}</span><span className="flex items-center gap-3 text-muted-foreground">{result.recorded} / {ballot.expectedVotes ?? "—"} votes<ChevronDown className="h-4 w-4" /></span></summary><div className="space-y-2 border-t p-5"><TurnoutWarning difference={result.difference} />{issue && <p className="mb-3 text-sm text-amber-800 dark:text-amber-300">{issue.message}</p>}{result.rows.map(candidate => <div key={candidate.candidateId} className="flex flex-col justify-between gap-1 text-sm sm:flex-row sm:gap-3"><span>{office.candidates.find(item => item.id === candidate.candidateId)?.name}</span><span className="font-mono sm:shrink-0">{candidate.inPerson} in person + {candidate.online} online = {candidate.total} · {(candidate.share * 100).toFixed(1)}%</span></div>)}<p className="border-t pt-2 text-sm">X / no candidate: {ballot.noCandidate.inPerson} in person + {ballot.noCandidate.online} online = {result.noCandidateTotal}</p><p className="text-xs text-muted-foreground">Recorded: {result.recorded}. Expected: {ballot.expectedVotes ?? "not set"}. Two-thirds needed: {result.total ? result.threshold : "—"}.</p></div></details>{canCorrect && <div className="election-controls flex justify-end border-t px-3 py-1"><Correction office={office} ballot={ballot} officeIndex={officeIndex} onCommand={onCommand} onDirty={onDirty} disabled={disabled} canOpen={canOpen} /></div>}</div>
  })}</div>
}

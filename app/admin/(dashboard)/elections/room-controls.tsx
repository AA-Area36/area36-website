"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Clipboard, ExternalLink, KeyRound, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { voteRoomPath, type RoomAdmin, type RoomCredential } from "@/lib/voting/types"
import { manageVotingRoomAction, votingCredentialsAction, votingQuorumsAction } from "./voting-actions"

type QuorumOption = { key: string; title: string; date: string }
export function QuorumSelect({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const [events, setEvents] = useState<QuorumOption[] | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let disposed = false
    void votingQuorumsAction().then(result => {
      if (disposed) return
      if (result.success) setEvents(result.events)
      else setError(result.error)
    }).catch(() => { if (!disposed) setError("The quorum list is unavailable.") })
    return () => { disposed = true }
  }, [attempt])
  return <label className="block min-w-0 space-y-2 text-sm font-medium">
    <span>Quorum event</span>
    <select value={value} onChange={event => onChange(event.target.value)} disabled={disabled || !events?.length} required className="h-10 w-full min-w-0 rounded-md border bg-background px-3 font-normal">
      <option value="">{error ? "Quorums unavailable" : events ? (events.length ? "Choose a quorum" : "No quorum events") : "Loading quorums…"}</option>
      {events?.map(event => <option value={event.key} key={event.key}>{event.date} · {event.title}</option>)}
    </select>
    {error && <span className="flex items-center gap-2"><span role="alert">{error}</span><Button type="button" variant="link" className="px-1" onClick={() => { setError(""); setAttempt(n => n + 1) }}>Retry</Button></span>}
  </label>
}

export function RoomControls({ room, pageId, canWrite, disabled = false, onChange }: {
  room: RoomAdmin; pageId: string; canWrite: boolean; disabled?: boolean; onChange: (room: RoomAdmin) => void
}) {
  const [pending, startTransition] = useTransition()
  const [credentials, setCredentials] = useState<RoomCredential[] | null>(null)
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const link = voteRoomPath(pageId)
  const open = room.status === "open"
  const locked = disabled || pending
  const manage = (operation: Parameters<typeof manageVotingRoomAction>[1]) => {
    setError(""); setStatus("")
    startTransition(async () => {
      try {
        const result = await manageVotingRoomAction(room.id, operation)
        if (!result.success) { setError(result.error); return }
        if (result.room.status === "closed") { setCloseOpen(false); setCredentialsOpen(false); setCredentials(null) }
        onChange(result.room)
      } catch { setError("The voting room change could not be confirmed. Try again.") }
    })
  }
  const showCredentials = () => {
    setError("")
    startTransition(async () => {
      try {
        const result = await votingCredentialsAction(room.id)
        if (!result.success) { setError(result.error); return }
        setCredentials(result.credentials)
        setCredentialsOpen(true)
      } catch { setError("Couldn’t load the private voter codes. Try again.") }
    })
  }
  const copy = async (value: string, message: string) => {
    try { await navigator.clipboard.writeText(value); setStatus(message) }
    catch { setStatus("Copy unavailable. Select the text and copy it manually.") }
  }
  return <section aria-label="Voting room controls" className="space-y-4 rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h3 className="flex items-center gap-2 font-semibold"><Radio className="size-4 text-primary" />{room.kind === "election" ? `Online ballot ${room.ballotNumber}` : "Motion voting room"}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{open ? "Voting open" : "Voting closed"} · {room.received} received / {room.eligible} eligible seats</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline"><a href={link} target="_blank" rel="noreferrer">Open public voting page<ExternalLink className="size-3.5" /></a></Button>
        <Button size="sm" variant="ghost" onClick={() => void copy(new URL(link, location.origin).href, "Voting link copied.")}><Clipboard className="size-3.5" />Copy link</Button>
      </div>
    </div>
    {open && canWrite && <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/35 p-4">
        <p className="text-xs text-muted-foreground">Room code <strong className="ml-3 font-mono text-lg tracking-widest text-foreground">{room.roomCode}</strong></p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={locked} onClick={() => manage(room.showCode ? "hide" : "show")}>{room.showCode ? "Hide code from public pages" : "Show code on public pages"}</Button>
          <Button size="sm" variant="outline" disabled={locked} onClick={() => manage("rotate")}>Regenerate room code</Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button size="sm" variant="outline" disabled={locked} onClick={showCredentials}><KeyRound className="size-4" />Private voter codes</Button>
        <Button size="sm" disabled={locked} onClick={() => setCloseOpen(true)}>Close online voting</Button>
      </div>
      <Dialog open={credentialsOpen} onOpenChange={value => { setCredentialsOpen(value); if (!value) setCredentials(null) }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Private voter codes</DialogTitle><DialogDescription>Give each eligible online seat its own unused code privately. Keep this list off the shared screen. Count each seat in only one channel.</DialogDescription></DialogHeader>
          <ul className="max-h-[55vh] divide-y overflow-y-auto">
            {credentials?.map(item => <li key={item.code} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{item.label}</span><Button variant="ghost" size="sm" onClick={() => void copy(item.code, "Voter code copied.")} aria-label={`Copy code for ${item.label}`} className="font-mono">{item.code}<Clipboard className="size-3.5" /></Button></li>)}
            {credentials?.length === 0 && <li className="py-3 text-sm text-muted-foreground">Every voter code has been used.</li>}
          </ul>
          <p role="status" className="text-sm text-muted-foreground">{status}</p>
        </DialogContent>
      </Dialog>
      <Dialog open={closeOpen} onOpenChange={value => { if (!pending) setCloseOpen(value) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Close online voting?</DialogTitle><DialogDescription>The room will stop accepting votes. {room.kind === "election" ? "Website totals will appear in the election tally." : "You can review the totals before publishing them."}</DialogDescription></DialogHeader>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button variant="outline" disabled={pending} onClick={() => setCloseOpen(false)}>Keep open</Button><Button disabled={pending} onClick={() => manage("close")}>{pending ? "Closing…" : "Close voting"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>}
    {!open && room.kind === "motion" && room.results && <>
      <dl className="grid grid-cols-3 gap-2">
        {room.results.map(choice => <div className="rounded-lg border px-4 py-3" key={choice.id}><dt className="text-sm text-muted-foreground">{choice.label}</dt><dd className="mt-1 font-mono text-2xl">{choice.votes}</dd></div>)}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{room.resultsPublished ? "Results are posted on the public page." : "Results are visible to tellers only."}</p>
        {canWrite && <Button variant={room.resultsPublished ? "outline" : "default"} size="sm" disabled={locked} onClick={() => manage(room.resultsPublished ? "unpublish" : "publish")}>{room.resultsPublished ? "Hide public results" : "Post motion results"}</Button>}
      </div>
    </>}
    {!credentialsOpen && status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
    {!closeOpen && error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>
}

export function useRoomPolling<T>(enabled: boolean, read: () => Promise<T>, onChange: (value: T) => void) {
  const busy = useRef(false)
  useEffect(() => {
    if (!enabled) return
    let disposed = false
    const timer = window.setInterval(async () => {
      if (document.hidden || busy.current) return
      busy.current = true
      try { const next = await read(); if (!disposed) onChange(next) }
      catch { /* Retain the current room when a refresh fails. */ }
      finally { busy.current = false }
    }, 5_000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [enabled, onChange, read])
}

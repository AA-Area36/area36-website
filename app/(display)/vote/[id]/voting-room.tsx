"use client"

import Link from "next/link"
import { useEffect, useRef, useState, useTransition } from "react"
import { CheckCircle2, LockKeyhole } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { PublicVotingRoom } from "@/lib/voting/types"
import { castVoteAction } from "../actions"

type Submission = { id: string; roomCode: string; voterCode: string; choiceId: string; receipt: string }

export function VotingRoom({ pageId, initialRoom }: { pageId: string; initialRoom: PublicVotingRoom | null }) {
  const [room, setRoom] = useState(initialRoom)
  const [received, setReceived] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState(false)
  useEffect(() => {
    let request: AbortController | null = null
    let disposed = false
    async function refresh() {
      if (request || document.hidden) return
      request = new AbortController()
      const timeout = window.setTimeout(() => request?.abort(), 8_000)
      try {
        const res = await fetch(`/api/voting/${pageId}`, { cache: "no-store", signal: request.signal })
        if (!res.ok) throw new Error()
        const fresh = await res.json() as PublicVotingRoom | null
        if (!disposed) { setRoom(fresh); setConnectionError(false) }
      } catch { if (!disposed) setConnectionError(true) }
      finally { window.clearTimeout(timeout); request = null }
    }
    const timer = window.setInterval(() => void refresh(), 4_000)
    document.addEventListener("visibilitychange", refresh)
    return () => { disposed = true; window.clearInterval(timer); request?.abort(); document.removeEventListener("visibilitychange", refresh) }
  }, [pageId])

  if (!room) return <><h1 className="font-serif text-4xl">Waiting for a ballot</h1><p className="mt-4 text-muted-foreground">This page checks for a new ballot automatically.</p>{connectionError && <p role="status" className="mt-3 text-sm text-destructive">Updates are temporarily unavailable.</p>}<p className="mt-5"><Link className="text-primary underline underline-offset-4" href="/vote">Join with a room code</Link></p></>
  const confirmed = received === room.id
  return <>
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">{room.kind === "motion" ? "Assembly motion" : `Third Legacy · Ballot ${room.ballotNumber}`}</p>
    <h1 className="break-words font-serif text-3xl leading-tight tracking-tight sm:text-4xl">{room.title}</h1>
    {connectionError && <p role="status" className="mt-4 text-sm text-destructive">This page couldn’t check for updates. It will retry automatically.</p>}
    {confirmed && <p role="status" className="mt-6 flex items-center gap-3 rounded-lg border border-emerald-600/40 bg-emerald-500/10 p-4 font-medium"><CheckCircle2 className="size-5 text-emerald-700 dark:text-emerald-400" />Your vote was recorded.</p>}
    {!confirmed && <BallotForm key={room.id} room={room} onReceived={() => setReceived(room.id)} />}
    {room.status === "closed" && <section className="mt-6 rounded-xl border bg-card p-5">
      <h2 className="font-serif text-2xl">{room.results ? "Motion results" : "Voting is closed"}</h2>
      {room.results ? <><dl className="mt-4 divide-y">{room.results.map(choice => <div key={choice.id} className="flex items-center justify-between py-3"><dt>{choice.label}</dt><dd className="font-mono text-xl tabular-nums">{choice.votes}</dd></div>)}</dl><p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{room.results.reduce((sum, choice) => sum + choice.votes, 0)} total votes</p></> :
        <p className="mt-2 text-sm text-muted-foreground">{room.kind === "election" ? "Keep this page open for the next ballot." : "The teller can post the results here."}</p>}
    </section>}
    <Link className="mt-6 inline-block text-sm text-primary underline underline-offset-4" href={room.kind === "election" && room.id !== pageId ? `/elections/${pageId}` : "/vote"}>{room.kind === "election" && room.id !== pageId ? "Election display" : "Join another room"}</Link>
  </>
}

function BallotForm({ room, onReceived }: { room: PublicVotingRoom; onReceived: () => void }) {
  const [choiceId, setChoiceId] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [retry, setRetry] = useState<Submission | null>(null)
  const roomInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!roomInput.current || roomInput.current.value) return
    try { roomInput.current.value = sessionStorage.getItem(`voting-room:${room.id}`) ?? "" } catch { /* Storage can be disabled. */ }
  }, [room.id, room.roomCode])

  if (room.status === "closed" && !retry) return null
  const disabled = pending || Boolean(retry) || room.status === "closed"
  return <form className="mt-6 space-y-6 rounded-xl border border-t-4 border-t-primary bg-card p-5 shadow-sm sm:p-7" onSubmit={event => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const submission = retry ?? { id: room.id, roomCode: room.roomCode ?? String(data.get("roomCode")), voterCode: String(data.get("voterCode")), choiceId, receipt: crypto.randomUUID() }
    setError("")
    startTransition(async () => {
      try {
        const result = await castVoteAction(submission)
        if (result.success) { onReceived(); return }
        setRetry(result.retry ? submission : null)
        setError(result.error ?? "Your vote could not be confirmed.")
      } catch {
        setRetry(submission)
        setError("We couldn’t confirm your vote. Retry this submission.")
      }
    })
  }}>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor={room.roomCode ? undefined : "ballot-room-code"} className="block text-sm font-medium">Room code</label>
        {room.roomCode ? <p className="rounded-md bg-muted px-3 py-3 font-mono text-sm tracking-widest">{room.roomCode}</p> : <Input ref={roomInput} id="ballot-room-code" name="roomCode" required maxLength={30} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={disabled} className="h-11 font-mono uppercase" />}
      </div>
      <div className="space-y-2">
        <label htmlFor="voter-code" className="block text-sm font-medium">Private voter code</label>
        <Input id="voter-code" name="voterCode" required maxLength={40} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={disabled} className="h-11 font-mono uppercase" />
      </div>
    </div>
    <p className="flex gap-2 text-sm text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0" />Get your private code from the teller. Your choice is counted anonymously.</p>
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-2 text-sm font-semibold">Choose one</legend>
      {room.choices.map(choice => <label key={choice.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/10"><input name="choice" type="radio" className="size-4 accent-primary" value={choice.id} checked={choiceId === choice.id} onChange={() => setChoiceId(choice.id)} required />{choice.label}</label>)}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending || (!retry && (!choiceId || room.status === "closed"))}>{pending ? "Submitting…" : retry ? "Retry submission" : "Cast vote"}</Button>
  </form>
}

"use client"

import { useRef, useState, useTransition } from "react"
import { Radio } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { RoomAdmin } from "@/lib/voting/types"
import { QuorumSelect, RoomControls } from "./room-controls"
import { openElectionRoomAction } from "./voting-actions"

export function ElectionOnlineBallot({ electionId, revision, officeIndex, ballotNumber, room, previousQuorum, otherOpen, canWrite, disabled, onChange, onOpening }: {
  electionId: string; revision: number; officeIndex: number; ballotNumber: number; room: RoomAdmin | undefined; previousQuorum?: string;
  otherOpen: boolean; canWrite: boolean; disabled: boolean; onChange: (room: RoomAdmin) => void; onOpening: (value: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [quorumKey, setQuorumKey] = useState(previousQuorum ?? "")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const id = useRef<string | null>(null)
  if (room) return <RoomControls key={room.id} room={room} pageId={electionId} canWrite={canWrite} disabled={disabled} onChange={onChange} />
  if (!canWrite) return null
  return <section aria-label="Website voting" className="rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h3 className="flex items-center gap-2 font-semibold"><Radio className="size-4 text-primary" />Website voting</h3>
        <p className="mt-1 text-sm text-muted-foreground">{otherOpen ? "Close the open online ballot for the other office first." : "Open an anonymous online ballot for eligible quorum seats."}</p></div>
      {!open && <Button variant="outline" size="sm" disabled={disabled || otherOpen} onClick={() => setOpen(true)}>Set up online ballot</Button>}
    </div>
    {open && <form className="mt-4 space-y-3" onSubmit={event => {
      event.preventDefault()
      setError("")
      id.current ??= crypto.randomUUID()
      const roomId = id.current
      onOpening(true)
      startTransition(async () => {
        try {
          const result = await openElectionRoomAction({ id: roomId, electionId, revision, officeIndex, quorumKey })
          if (!result.success) { setError(result.error); return }
          onChange(result.room)
        } catch { setError("Opening this ballot could not be confirmed. Retry or reload the election.") }
        finally { onOpening(false) }
      })
    }}>
      <div className="flex flex-wrap items-end gap-3"><div className="min-w-0 flex-1"><QuorumSelect value={quorumKey} onChange={setQuorumKey} disabled={disabled || pending} /></div>
        <Button type="submit" size="sm" disabled={!quorumKey || disabled || pending || otherOpen}>{pending ? "Opening…" : `Open online ballot ${ballotNumber}`}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
      </div>
      <p className="text-xs text-muted-foreground">The voting roster is taken from the quorum when the ballot opens.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>}
  </section>
}

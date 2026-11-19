"use client"

import { useRouter } from "next/navigation"
import { useCallback, useRef, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { RoomAdmin } from "@/lib/voting/types"
import { QuorumSelect, RoomControls, useRoomPolling } from "../room-controls"
import { motionRoomAction, openMotionRoomAction } from "../voting-actions"

export function CreateMotion() {
  const router = useRouter()
  const id = useRef<string | null>(null)
  const [title, setTitle] = useState("")
  const [quorumKey, setQuorumKey] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  return <form className="space-y-4 rounded-xl border bg-card p-5 sm:p-6" onSubmit={event => {
    event.preventDefault()
    setError("")
    id.current ??= crypto.randomUUID()
    const requestId = id.current
    startTransition(async () => {
      try {
        const result = await openMotionRoomAction({ id: requestId, title, quorumKey })
        if (!result.success) { setError(result.error); return }
        router.push(`/admin/elections/motions/${result.room.id}`)
      } catch { setError("Opening this room could not be confirmed. Retry this form.") }
    })
  }}>
    <h2 className="font-serif text-2xl">Open a motion</h2>
    <label className="block space-y-2 text-sm font-medium"><span>Question to put to a vote</span><Textarea rows={3} value={title} onChange={event => setTitle(event.target.value)} required maxLength={500} disabled={pending} /></label>
    <QuorumSelect value={quorumKey} onChange={setQuorumKey} disabled={pending} />
    <p className="text-sm text-muted-foreground">Only voting seats checked into this quorum when you open the room receive a code.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={pending || !quorumKey || !title.trim()}>{pending ? "Opening room…" : "Open motion voting"}</Button>
  </form>
}

export function MotionControls({ initialRoom, canWrite }: { initialRoom: RoomAdmin; canWrite: boolean }) {
  const [room, setRoom] = useState(initialRoom)
  const read = useCallback(() => motionRoomAction(initialRoom.id), [initialRoom.id])
  const sync = useCallback((next: RoomAdmin | null) => {
    if (next) setRoom(current => next.version < current.version ? current : next)
  }, [])
  useRoomPolling(room.status === "open", read, sync)
  return <RoomControls room={room} pageId={room.id} canWrite={canWrite} onChange={setRoom} />
}

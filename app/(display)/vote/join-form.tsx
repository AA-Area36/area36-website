"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { voteRoomPath } from "@/lib/voting/types"
import { joinVotingRoomAction } from "./actions"

export function JoinForm() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  return <form className="mt-7 space-y-4 rounded-xl border bg-card p-6" onSubmit={event => {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get("roomCode") ?? "")
    setError("")
    startTransition(async () => {
      try {
        const result = await joinVotingRoomAction(code)
        if (!result.room) { setError(result.error ?? "This room is unavailable."); return }
        try { sessionStorage.setItem(`voting-room:${result.room.roomId}`, code) } catch { /* Code can be entered on the next page. */ }
        router.push(voteRoomPath(result.room.pageId))
      } catch { setError("The voting room is temporarily unavailable.") }
    })
  }}>
    <div className="space-y-2"><Label htmlFor="join-code">Room code</Label><Input id="join-code" name="roomCode" className="h-12 font-mono uppercase tracking-widest" required maxLength={30} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={pending} /></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Finding room…" : "Join voting room"}<ArrowRight className="size-4" /></Button>
  </form>
}

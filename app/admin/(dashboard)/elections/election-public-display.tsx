"use client"

import { useState } from "react"
import { ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ElectionCommand, ElectionRecord } from "@/lib/elections/model"

export function ElectionPublicDisplay({ election, officeIndex, onCommand, canWrite, disabled }: { election: ElectionRecord; officeIndex: number; onCommand: (command: ElectionCommand) => Promise<boolean>; canWrite: boolean; disabled: boolean }) {
  const [busy, setBusy] = useState(false)
  const display = election.state.publicDisplay
  const published = display?.enabled === true
  const send = async (enabled: boolean) => {
    setBusy(true)
    try { await onCommand({ type: "display", officeIndex, enabled }) } finally { setBusy(false) }
  }
  return <section aria-label="Public election display" className="election-controls flex flex-col justify-between gap-4 rounded-xl border bg-card p-5 lg:flex-row lg:items-center">
    <div><h2 className="flex items-center gap-2 text-sm font-semibold"><Share2 className="h-4 w-4 text-primary" />Public election display · {published ? "Sharing is on" : "Not shared"}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Anyone with the link can view candidate names and saved tallies, including the ballot being counted. The display has no editing controls.</p>{published && <p className="mt-2 text-xs text-primary">Following: {election.state.offices[display.officeIndex]?.name}</p>}</div>
    <div className="flex shrink-0 flex-wrap gap-2">
      {published && <Button asChild variant="outline" size="sm"><a href={`/elections/${election.id}`} target="_blank" rel="noreferrer">Open public display<ExternalLink className="h-3.5 w-3.5" /></a></Button>}
      {canWrite && published && display.officeIndex !== officeIndex && <Button variant="outline" size="sm" disabled={disabled || busy} onClick={() => void send(true)}>Show {election.state.offices[officeIndex].name}</Button>}
      {canWrite && <Button variant={published ? "outline" : "default"} size="sm" disabled={disabled || busy} onClick={() => void send(!published)}>{busy ? "Saving…" : published ? "Stop sharing" : "Publish display"}</Button>}
    </div>
  </section>
}

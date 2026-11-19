"use client"

import { useState } from "react"
import { ExternalLink, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RESULT_ORDERS, RESULT_ORDER_LABELS, type ElectionCommand, type ElectionRecord, type ResultOrder } from "@/lib/elections/model"

type DisplayOptions = Pick<Extract<ElectionCommand, { type: "display" }>, "showLive" | "order" | "summary">

export function ElectionPublicDisplay({ election, officeIndex, onCommand, canWrite, disabled }: { election: ElectionRecord; officeIndex: number; onCommand: (command: ElectionCommand) => Promise<boolean>; canWrite: boolean; disabled: boolean }) {
  const [busy, setBusy] = useState(false)
  const display = election.state.publicDisplay
  const published = display?.enabled === true
  const showLive = display?.showLive ?? Boolean(display)
  const link = `/elections/${election.id}`
  const send = async (enabled: boolean, options?: DisplayOptions) => {
    setBusy(true)
    try { await onCommand({ type: "display", officeIndex: options ? (display?.officeIndex ?? officeIndex) : officeIndex, enabled, ...options }) }
    finally { setBusy(false) }
  }
  return <section aria-label="Public election display" className="election-controls space-y-4 rounded-xl border bg-card p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="flex items-center gap-2 text-sm font-semibold"><Share2 className="size-4 text-primary" />Public election display</h2>
        <p className="mt-1 text-sm text-muted-foreground">{published ? `Sharing is on · Following ${election.state.offices[display.officeIndex]?.name}` : "Sharing is off"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {published && <Button asChild variant="outline" size="sm"><a href={link} target="_blank" rel="noreferrer">Open public display<ExternalLink className="size-3.5" /></a></Button>}
        {canWrite && published && display.officeIndex !== officeIndex && <Button variant="outline" size="sm" disabled={disabled || busy} onClick={() => void send(true)}>Show {election.state.offices[officeIndex].name}</Button>}
        {canWrite && <Button variant={published ? "outline" : "default"} size="sm" disabled={disabled || busy} onClick={() => void send(!published)}>{busy ? "Saving…" : published ? "Stop sharing" : "Publish display"}</Button>}
      </div>
    </div>
    {(canWrite || (published && display.summary)) && <div className="flex flex-wrap items-end gap-4 border-t pt-4">
      {canWrite && <>
        <label className="min-w-40 space-y-1 text-sm"><span className="block font-medium">Show the public</span><select className="h-9 w-full rounded-md border bg-background px-2" value={showLive ? "live" : "recorded"} disabled={disabled || busy} onChange={event => void send(published, { showLive: event.target.value === "live" })}><option value="recorded">Recorded ballots only</option><option value="live">Live tally and recorded ballots</option></select></label>
        <label className="min-w-40 space-y-1 text-sm"><span className="block font-medium">Result order</span><select className="h-9 w-full rounded-md border bg-background px-2" value={display?.order ?? "entered"} disabled={disabled || busy} onChange={event => void send(published, { order: event.target.value as ResultOrder })}>{RESULT_ORDERS.map(order => <option key={order} value={order}>{RESULT_ORDER_LABELS[order]}</option>)}</select></label>
        {published && <Button size="sm" variant="outline" disabled={disabled || busy || (!display?.summary && !election.state.offices.some(office => office.status === "elected"))} onClick={() => void send(true, { summary: !display?.summary })}>{display?.summary ? "Hide election summary" : "Post election summary"}</Button>}
      </>}
      {published && display.summary && <Button asChild size="sm" variant="ghost"><a href={`${link}#results`} target="_blank" rel="noreferrer">Open posted summary<ExternalLink className="size-3.5" /></a></Button>}
    </div>}
  </section>
}

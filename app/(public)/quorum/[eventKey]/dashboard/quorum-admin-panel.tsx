"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, MoreHorizontal, RefreshCw, Search, ShieldCheck, UserRoundX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { NEWSLETTER_DELIVERY_OPTIONS, SERVICE_POSITION_OPTIONS } from "@/lib/quorum/constants"
import type { ClassifiedQuorumRow, QuorumAdminRow } from "@/lib/quorum/types"

type AdminRow = ClassifiedQuorumRow<QuorumAdminRow>
type CorrectionAction = "exclude" | "restore" | "make_voting" | "make_non_voting" | "clear_override"

const positionLabels = new Map(SERVICE_POSITION_OPTIONS.map((item) => [item.value, item.label]))
const newsletterDeliveryLabels = new Map(NEWSLETTER_DELIVERY_OPTIONS.map((item) => [item.value, item.label]))

export function QuorumAdminPanel({ eventKey }: { eventKey: string }) {
  const [rows, setRows] = useState<AdminRow[] | null>(null)
  const [query, setQuery] = useState("")
  const [closed, setClosed] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [correction, setCorrection] = useState<{ row: AdminRow; action: CorrectionAction } | null>(null)
  const loadInFlight = useRef(false)

  const load = useCallback(async () => {
    if (loadInFlight.current) return
    loadInFlight.current = true
    try {
      const response = await fetch(`/api/quorum/${eventKey}/admin/attendees`, { cache: "no-store" })
      if (response.status === 401 || response.status === 403) return
      if (!response.ok) return
      const data = (await response.json()) as { closed: boolean; canEdit?: boolean; rows?: AdminRow[] }
      if (data.closed) { setClosed(true); setRows(null); return }
      setCanEdit(data.canEdit === true)
      setRows(data.rows ?? [])
    } finally {
      loadInFlight.current = false
    }
  }, [eventKey])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0)
    const interval = window.setInterval(() => { if (!document.hidden) void load() }, 10_000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(interval)
    }
  }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return rows ?? []
    return (rows ?? []).filter((row) => [row.name, row.district, row.homeGroup, row.email, row.servicePosition].some((value) => value.toLowerCase().includes(needle)))
  }, [query, rows])

  if (closed || rows === null) return null

  return (
    <section className="mx-auto mt-12 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-amber-300/40 bg-card shadow-lg shadow-amber-500/5">
        <div className="border-b bg-amber-50/70 p-5 dark:bg-amber-950/15 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-6 w-6 text-amber-700 dark:text-amber-400" /><div><h2 className="text-xl font-semibold">Administrator attendee view</h2><p className="mt-1 text-sm text-muted-foreground">Private information. Corrections are written directly to the event spreadsheet.</p></div></div>
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
          </div>
          <div className="relative mt-5 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search name, district, group, or email" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-5 py-3">Attendee</th><th className="px-4 py-3">Representation</th><th className="px-4 py-3">Voting status</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Address</th><th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y">
              {filtered.map((row) => (
                <tr key={row.submissionId} className={row.counted ? "align-top" : "align-top bg-muted/30 opacity-65"}>
                  <td className="px-5 py-4"><p className="font-medium">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(row.submittedAt).toLocaleString()}</p>{row.correctionReason && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Last correction: {row.correctionReason}</p>}</td>
                  <td className="px-4 py-4"><p>{positionLabels.get(row.servicePosition) ?? row.servicePosition}{row.isAlternate ? " · Alternate" : ""}</p><p className="mt-1 text-xs text-muted-foreground">District {row.district} · {row.homeGroup}</p>{row.positionDetail && <p className="mt-1 text-xs text-muted-foreground">{row.positionDetail}</p>}</td>
                  <td className="px-4 py-4"><div className="flex flex-wrap gap-2"><Badge variant={row.effectiveClassification === "voting" && row.counted ? "default" : "secondary"}>{row.counted ? (row.effectiveClassification === "voting" ? "Voting" : "Non-voting") : "Excluded"}</Badge>{row.adminVotingOverride && <Badge variant="outline">Override</Badge>}</div>{row.conflict && <p className="mt-2 flex max-w-xs gap-1.5 text-xs text-amber-700 dark:text-amber-400"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{row.conflict}</p>}</td>
                  <td className="px-4 py-4"><a className="text-primary hover:underline" href={`mailto:${row.email}`}>{row.email}</a><p className="mt-1">{row.phone}</p><p className="mt-2 text-xs text-muted-foreground">The Pigeon: {newsletterDeliveryLabels.get(row.newsletterDelivery) ?? "Neither"}</p></td>
                  <td className="px-4 py-4 text-muted-foreground"><p>{row.streetAddress}</p><p>{row.city}, {row.state} {row.zip}</p></td>
                  <td className="px-3 py-4">{canEdit && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Correct {row.name}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setCorrection({ row, action: row.counted ? "exclude" : "restore" })}>{row.counted ? <><UserRoundX className="mr-2 h-4 w-4" />Exclude duplicate</> : <><CheckCircle2 className="mr-2 h-4 w-4" />Restore submission</>}</DropdownMenuItem>
                    {row.seatKey && <><DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setCorrection({ row, action: "make_voting" })}>Make voting representative</DropdownMenuItem><DropdownMenuItem onSelect={() => setCorrection({ row, action: "make_non_voting" })}>Mark non-voting</DropdownMenuItem>{row.adminVotingOverride && <DropdownMenuItem onSelect={() => setCorrection({ row, action: "clear_override" })}>Clear voting override</DropdownMenuItem>}</>}
                  </DropdownMenuContent></DropdownMenu>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No attendees match this search.</div>}
        </div>
      </div>
      <CorrectionDialog eventKey={eventKey} correction={correction} onClose={() => setCorrection(null)} onSaved={async () => { setCorrection(null); await load(); window.dispatchEvent(new Event("quorum-updated")) }} />
    </section>
  )
}

function CorrectionDialog({ eventKey, correction, onClose, onSaved }: { eventKey: string; correction: { row: AdminRow; action: CorrectionAction } | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const labels: Record<CorrectionAction, string> = { exclude: "Exclude duplicate submission", restore: "Restore submission", make_voting: "Make voting representative", make_non_voting: "Mark non-voting", clear_override: "Clear voting override" }

  function save() {
    if (!correction) return
    setError(null)
    startTransition(async () => {
      const response = await fetch(`/api/quorum/${eventKey}/admin/attendees`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: correction.row.submissionId, action: correction.action, reason }) })
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        setError(data.error ?? "Correction could not be saved.")
        return
      }
      setReason("")
      await onSaved()
    })
  }

  return <Dialog open={!!correction} onOpenChange={(open) => { if (!open) { setReason(""); setError(null); onClose() } }}><DialogContent><DialogHeader><DialogTitle>{correction ? labels[correction.action] : "Correct attendance"}</DialogTitle><DialogDescription>{correction ? `This change affects ${correction.row.name} and will be recorded in the event spreadsheet.` : ""}</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="correction-reason">Reason</Label><Textarea id="correction-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Duplicate entry, primary present, role correction…" />{error && <p className="text-sm text-destructive">{error}</p>}</div><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={isPending || reason.trim().length < 3}>{isPending ? "Saving…" : "Save correction"}</Button></DialogFooter></DialogContent></Dialog>
}

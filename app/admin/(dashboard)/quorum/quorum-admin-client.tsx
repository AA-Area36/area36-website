"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarDays, Check, Clipboard, ExternalLink, FileSpreadsheet, Plus, Printer, QrCode, Radio, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { QuorumEvent } from "@/lib/quorum/types"
import { closeQuorumEventAction, connectQuorumDriveAction, createQuorumEventAction, featureQuorumEventAction } from "./actions"

export function QuorumAdminClient({
  events,
  configurationError = false,
  driveAuthorized = false,
  ownerEmail,
}: {
  events: QuorumEvent[]
  configurationError?: boolean
  driveAuthorized?: boolean
  ownerEmail: string
}) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [form, setForm] = useState({ title: "", eventDate: today, quorumTarget: "", featured: true })

  function createEvent() {
    setError(null)
    startTransition(async () => {
      const result = await createQuorumEventAction({
        title: form.title,
        eventDate: form.eventDate,
        quorumTarget: Number(form.quorumTarget),
        featured: form.featured,
      })
      if (!result.success) { setError(result.error); return }
      setDialogOpen(false)
      setForm({ title: "", eventDate: today, quorumTarget: "", featured: true })
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary"><Radio className="h-4 w-4" />Meeting operations</div><h1 className="text-3xl font-bold tracking-tight">Quorum events</h1><p className="mt-2 max-w-2xl text-muted-foreground">Create a private attendance sheet, publish check-in, and monitor voting representation from one place.</p></div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger asChild><Button disabled={!driveAuthorized}><Plus className="mr-2 h-4 w-4" />Create event</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create quorum event</DialogTitle><DialogDescription>A private Google Sheet and reusable public links will be created automatically.</DialogDescription></DialogHeader><div className="space-y-5 py-2">
          <div className="space-y-2"><Label htmlFor="quorum-title">Event title</Label><Input id="quorum-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="August Area Committee Meeting" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="quorum-date">Event date</Label><Input id="quorum-date" type="date" value={form.eventDate} onChange={(event) => setForm((current) => ({ ...current, eventDate: event.target.value }))} /></div><div className="space-y-2"><Label htmlFor="quorum-target">Required voting members</Label><Input id="quorum-target" type="number" min={1} inputMode="numeric" value={form.quorumTarget} onChange={(event) => setForm((current) => ({ ...current, quorumTarget: event.target.value }))} placeholder="35" /><p className="text-xs text-muted-foreground">Enter the actual quorum threshold for this event.</p></div></div>
          <div className="flex items-center justify-between rounded-lg border p-4"><div><Label htmlFor="quorum-featured">Show on homepage</Label><p className="mt-1 text-xs text-muted-foreground">Replaces the currently featured quorum event.</p></div><Switch id="quorum-featured" checked={form.featured} onCheckedChange={(checked) => setForm((current) => ({ ...current, featured: checked }))} /></div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
        </div><DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={createEvent} disabled={isPending}>{isPending ? "Creating sheet…" : "Create event"}</Button></DialogFooter></DialogContent></Dialog>
      </div>

      {!driveAuthorized && <div className="rounded-2xl border border-amber-300/50 bg-amber-50 p-6 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100"><h2 className="font-semibold">Connect Quorum Drive</h2><p className="mt-2 text-sm leading-6">Connect <strong>{ownerEmail}</strong> once. Google will grant this site access only to the Drive files it creates for quorum.</p><form action={connectQuorumDriveAction} className="mt-4"><Button type="submit">Connect Google Drive</Button></form></div>}

      {configurationError && driveAuthorized && <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6"><h2 className="font-semibold">Google Drive is connected</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Create the first event to create the private Quorum folder and its first spreadsheet automatically.</p></div>}

      {!configurationError && events.length === 0 && <Card><CardContent className="py-14 text-center"><QrCode className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">No quorum events yet</h2><p className="mt-2 text-sm text-muted-foreground">Create the first event to generate its sheet, check-in page, dashboard, and QR code.</p></CardContent></Card>}

      <div className="grid gap-5 xl:grid-cols-2">
        {events.map((event) => <EventCard key={event.eventKey} event={event} onChanged={() => router.refresh()} />)}
      </div>
    </div>
  )
}

function EventCard({ event, onChanged }: { event: QuorumEvent; onChanged: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formPath = `/quorum/${event.eventKey}`
  const dashboardPath = `${formPath}/dashboard`
  const displayDate = new Date(`${event.eventDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  function copy(path: string, name: string) {
    void navigator.clipboard.writeText(`${window.location.origin}${path}`).then(() => { setCopied(name); window.setTimeout(() => setCopied(null), 1600) })
  }

  return <Card className="overflow-hidden"><CardHeader className="border-b bg-muted/20"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap gap-2"><Badge variant={event.status === "open" ? "default" : "secondary"}>{event.status === "open" ? "Open" : "Closed"}</Badge>{event.featured && <Badge variant="outline">Homepage</Badge>}</div><CardTitle className="mt-3 text-xl">{event.title}</CardTitle><CardDescription className="mt-1 flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{displayDate} · Target {event.quorumTarget}</CardDescription></div><div className="rounded-xl border bg-white p-2 dark:bg-white"><Image src={`/api/quorum/${event.eventKey}/qr`} alt={`QR code for ${event.title}`} width={92} height={92} unoptimized /></div></div></CardHeader><CardContent className="space-y-5 pt-5">
    <div className="grid gap-2 sm:grid-cols-2"><Button asChild variant="outline" className="justify-start"><Link href={formPath} target="_blank"><ExternalLink className="mr-2 h-4 w-4" />Check-in form</Link></Button><Button asChild variant="outline" className="justify-start"><Link href={dashboardPath} target="_blank"><Radio className="mr-2 h-4 w-4" />Live dashboard</Link></Button><Button variant="outline" className="justify-start" onClick={() => copy(formPath, "form")}><span>{copied === "form" ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}</span>Copy form link</Button><Button variant="outline" className="justify-start" onClick={() => copy(dashboardPath, "dashboard")}><span>{copied === "dashboard" ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}</span>Copy dashboard link</Button></div>
    <div className="flex flex-wrap gap-2"><Button asChild size="sm" variant="ghost"><a href={`/api/quorum/${event.eventKey}/qr?download=1`}><QrCode className="mr-2 h-4 w-4" />Download QR</a></Button><Button asChild size="sm" variant="ghost"><a href={`/api/quorum/${event.eventKey}/qr`} target="_blank"><Printer className="mr-2 h-4 w-4" />Open / print</a></Button>{event.webViewLink && <Button asChild size="sm" variant="ghost"><a href={event.webViewLink} target="_blank" rel="noreferrer"><FileSpreadsheet className="mr-2 h-4 w-4" />Open sheet</a></Button>}</div>
    {event.status === "open" && <div className="flex flex-wrap justify-between gap-3 border-t pt-4">{!event.featured ? <Button size="sm" variant="outline" disabled={isPending} onClick={() => startTransition(async () => { await featureQuorumEventAction(event.eventKey); onChanged() })}>Feature on homepage</Button> : <span /> }<Button size="sm" variant="destructive" disabled={isPending} onClick={() => { if (window.confirm("Close check-in and remove private attendee details from the dashboard?")) startTransition(async () => { await closeQuorumEventAction(event.eventKey); onChanged() }) }}><X className="mr-2 h-4 w-4" />Close event</Button></div>}
  </CardContent></Card>
}

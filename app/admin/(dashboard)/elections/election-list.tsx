"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useRef, useState, useTransition } from "react"
import { ArrowRight, CheckCircle2, FileSpreadsheet, Plus, Vote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { OFFICE_NAMES, PROCEDURE_URL, type ElectionRecord } from "@/lib/elections/model"
import { connectElectionDriveAction, createElectionAction } from "./actions"

export function ElectionList({ elections, driveAuthorized, canWrite }: { elections: ElectionRecord[]; driveAuthorized: boolean; canWrite: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [date, setDate] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const creationId = useRef<string | null>(null)
  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Area 36 · Service elections</p><h1 className="font-serif text-4xl tracking-tight sm:text-5xl">Third Legacy elections</h1><p className="mt-3 max-w-xl text-muted-foreground">A clear path through every ballot, from the first tally to the final result.</p></div>
      {canWrite && <Button onClick={() => { setOpen(true); creationId.current ??= crypto.randomUUID() }}><Plus className="h-4 w-4" />New election</Button>}
    </div>
    {!driveAuthorized && <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100 sm:flex-row sm:items-center"><div><p className="font-medium">Connect Google Drive to keep an election sheet.</p><p className="mt-1 text-sm">Election work is saved here. Sheets sync once the Area account is connected.</p></div>{canWrite && <form action={connectElectionDriveAction}><Button type="submit" variant="outline" className="border-amber-600 bg-transparent text-inherit">Connect Google Drive</Button></form>}</div>}
    <div className="grid gap-4 sm:grid-cols-3">{[
      ["01", "Set up the candidates", "Choose an office and enter the names standing for election."],
      ["02", "Record each ballot", "Enter in person and online totals. Check the expected vote count."],
      ["03", "Follow the procedure", "See who remains, when a motion is needed, and when to go to the hat."],
    ].map(([step, heading, description]) => <div key={step} className="border-t-2 border-primary/30 pt-5"><span className="font-mono text-sm text-primary">{step}</span><h2 className="mt-3 font-semibold">{heading}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div>)}</div>
    <section aria-labelledby="saved-elections" className="space-y-4"><h2 id="saved-elections" className="text-lg font-semibold">Election records</h2>{elections.length ? <div className="grid gap-4 md:grid-cols-2">{elections.map(election => {
      const completed = election.state.offices.filter(office => office.status === "elected").length
      return <Link key={election.id} href={`/admin/elections/${election.id}`} className="group rounded-xl border bg-card p-6 transition-colors hover:border-primary"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">{election.state.date}</span><span className="text-xs text-muted-foreground">{completed} of {OFFICE_NAMES.length} offices elected</span></div><h3 className="mt-3 font-serif text-2xl">{election.state.title}</h3><div className="mt-6 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-muted-foreground">{election.syncedRevision === election.revision ? <><CheckCircle2 className="h-4 w-4" />Saved to Google Sheets</> : <><FileSpreadsheet className="h-4 w-4" />{election.syncError ? "Drive sync needs attention" : "Google Sheets sync pending"}</>}</span><ArrowRight className="h-5 w-5 text-primary transition-transform group-hover:translate-x-1" /></div></Link>
    })}</div> : <div className="rounded-xl border border-dashed bg-card px-6 py-12 text-center"><Vote className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="font-serif text-2xl">Ready for the first ballot.</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Create an election to prepare the six offices in your template. You can set up each office as you go.</p></div>}</section>
    <p className="text-sm text-muted-foreground">Procedure guidance follows <a className="text-primary" href={PROCEDURE_URL} target="_blank" rel="noreferrer">The A.A. Service Manual, Appendix G</a>.</p>
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value) }}><DialogContent><DialogHeader><DialogTitle className="font-serif text-2xl">New election</DialogTitle><DialogDescription>One election record includes Delegate, Alt Delegate, Chair, Alt Chair, Secretary, and Treasurer.</DialogDescription></DialogHeader><form className="mt-2 space-y-5" onSubmit={event => {
      event.preventDefault(); setError(null)
      startTransition(async () => {
        try {
          const result = await createElectionAction({ id: creationId.current, title, date })
          if (!result.success) { setError(result.error); return }
          router.push(`/admin/elections/${result.election.id}`)
        } catch { setError("Creation could not be confirmed. Retry this same form.") }
      })
    }}><div className="space-y-2"><Label htmlFor="election-title">Election title</Label><Input id="election-title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Area 36 officer elections" required maxLength={150} disabled={pending} /></div><div className="space-y-2"><Label htmlFor="election-date">Election date</Label><Input id="election-date" type="date" value={date} onChange={event => setDate(event.target.value)} required disabled={pending} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={pending} className="w-full">{pending ? "Creating election…" : "Create election"}<ArrowRight className="h-4 w-4" /></Button></form></DialogContent></Dialog>
  </div>
}

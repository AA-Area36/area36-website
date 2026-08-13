"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, ClipboardCheck, Radio } from "lucide-react"
import { Button } from "@/components/ui/button"

type FeaturedEvent = { eventKey: string; title: string; eventDate: string }

export function QuorumBanner() {
  const [event, setEvent] = useState<FeaturedEvent | null>(null)
  useEffect(() => {
    let active = true
    const load = async () => {
      const response = await fetch("/api/quorum/featured", { cache: "no-store" }).catch(() => null)
      if (!active || !response?.ok) return
      setEvent((await response.json()) as FeaturedEvent | null)
    }
    void load()
    const interval = window.setInterval(load, 60_000)
    return () => { active = false; window.clearInterval(interval) }
  }, [])
  if (!event) return null
  const date = new Date(`${event.eventDate}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
  return <section className="border-b border-primary/15 bg-primary text-primary-foreground"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div className="flex items-start gap-3"><div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15"><Radio className="h-4 w-4" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/70">Event check-in · {date}</p><p className="mt-0.5 font-semibold">{event.title}</p></div></div><div className="flex gap-2"><Button asChild size="sm" variant="secondary"><Link href={`/quorum/${event.eventKey}`}><ClipboardCheck className="mr-2 h-4 w-4" />Check in</Link></Button><Button asChild size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"><Link href={`/quorum/${event.eventKey}/dashboard`}>Quorum <ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div></div></section>
}

"use client"

import * as React from "react"
import { Calendar, HelpCircle, Plus } from "lucide-react"
import { EventsClient } from "./events-client"
import { getAnnualCalendarFiles, type CalendarFile } from "./calendar-file-actions"
import type { DisplayEvent } from "@/lib/types/recurrence"
import { Button } from "@/components/ui/button"

interface EventsHeroContent {
  title: string
  description: string
}

interface EventsLoaderProps {
  hero: EventsHeroContent
}

export function EventsLoader({ hero }: EventsLoaderProps) {
  const [events, setEvents] = React.useState<DisplayEvent[] | null>(null)
  const [calendarFiles, setCalendarFiles] = React.useState<CalendarFile[]>([])
  const [loadState, setLoadState] = React.useState<"loading" | "ready" | "error">("loading")
  const [loadAttempt, setLoadAttempt] = React.useState(0)

  React.useEffect(() => {
    let active = true

    const loadData = async () => {
      setLoadState("loading")
      setEvents(null)
      setCalendarFiles([])

      // Supporting documents load independently and must never hold the core
      // event calendar behind Drive latency or an upstream failure.
      void getAnnualCalendarFiles()
        .then((files) => {
          if (active) setCalendarFiles(files)
        })
        .catch((error) => {
          console.error("Failed to load annual calendar files:", error)
        })

      try {
        const eventsResponse = await fetch("/api/events")

        if (!eventsResponse.ok) {
          throw new Error(`Events API error: ${eventsResponse.status}`)
        }

        const eventsData: unknown = await eventsResponse.json()
        if (!Array.isArray(eventsData)) {
          throw new Error("Events API returned an invalid response")
        }

        if (active) {
          setEvents(eventsData as DisplayEvent[])
          setLoadState("ready")
        }
      } catch (err) {
        if (!active) return
        console.error("Failed to load events:", err)
        setLoadState("error")
      }
    }

    void loadData()
    return () => {
      active = false
    }
  }, [loadAttempt])

  if (loadState === "loading" || !events) {
    if (loadState === "error") {
      return (
        <EventsUnavailable
          hero={hero}
          onRetry={() => setLoadAttempt((attempt) => attempt + 1)}
        />
      )
    }
    return <EventsLoading hero={hero} />
  }

  return <EventsClient events={events} calendarFiles={calendarFiles} hero={hero} />
}

function EventsLoading({ hero }: { hero: EventsHeroContent }) {
  return (
    <div aria-busy="true">
      <section className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20" aria-labelledby="events-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 id="events-heading" className="text-4xl font-bold text-foreground sm:text-5xl">{hero.title}</h1>
              <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{hero.description}</p>
            </div>
            <div className="flex flex-wrap gap-3" aria-hidden="true">
              <Button disabled variant="outline"><HelpCircle className="mr-2 h-4 w-4" />How to Submit</Button>
              <Button disabled><Plus className="mr-2 h-4 w-4" />Submit Event</Button>
              <Button disabled variant="outline"><Calendar className="mr-2 h-4 w-4" />Subscribe</Button>
            </div>
          </div>
        </div>
      </section>
      <div className="border-b border-border bg-muted/30 py-4" aria-hidden="true">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="h-9 w-full max-w-sm flex-1 rounded-md bg-muted" />
          <div className="h-9 w-full rounded-md bg-muted sm:w-44" />
          <div className="h-9 w-full rounded-md bg-muted sm:w-44" />
          <div className="h-9 w-full rounded-md bg-muted sm:w-52" />
        </div>
      </div>
      <section className="py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <p className="flex h-16 items-center justify-center border-b border-border p-4 text-center text-muted-foreground" role="status" aria-live="polite">Loading events...</p>
            <div className="grid grid-cols-7 border-b border-border bg-muted/30" aria-hidden="true">
              {Array.from({ length: 7 }, (_, index) => <div key={index} className="h-9" />)}
            </div>
            <div className="grid min-h-[36rem] grid-cols-7" aria-hidden="true">
              {Array.from({ length: 42 }, (_, index) => (
                <div key={index} className="min-h-24 border-b border-r border-border bg-muted/10" />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function EventsUnavailable({
  hero,
  onRetry,
}: {
  hero: EventsHeroContent
  onRetry: () => void
}) {
  return (
    <>
      <section
        className="bg-gradient-to-b from-primary/5 to-background py-16 sm:py-20"
        aria-labelledby="events-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 id="events-heading" className="text-4xl font-bold text-foreground sm:text-5xl">
            {hero.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            {hero.description}
          </p>
        </div>
      </section>
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-xl border border-destructive/40 bg-destructive/5 p-6"
            role="alert"
            aria-live="assertive"
          >
            <h2 className="text-xl font-semibold text-foreground">
              Event information is temporarily unavailable
            </h2>
            <p className="mt-2 text-muted-foreground">
              We couldn&apos;t load the calendar. This does not mean there are no upcoming
              events. Please try again.
            </p>
            <Button className="mt-5" type="button" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}

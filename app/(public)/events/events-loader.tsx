"use client"

import * as React from "react"
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

      try {
        // Calendar files are optional supporting content; their failure should
        // not hide an otherwise healthy event calendar.
        const [eventsResponse, calendarFilesData] = await Promise.all([
          fetch("/api/events"),
          getAnnualCalendarFiles().catch((error) => {
            console.error("Failed to load annual calendar files:", error)
            return []
          }),
        ])

        if (!eventsResponse.ok) {
          throw new Error(`Events API error: ${eventsResponse.status}`)
        }

        const eventsData: unknown = await eventsResponse.json()
        if (!Array.isArray(eventsData)) {
          throw new Error("Events API returned an invalid response")
        }

        if (active) {
          setEvents(eventsData as DisplayEvent[])
          setCalendarFiles(calendarFilesData)
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
    return <EventsLoading />
  }

  return <EventsClient events={events} calendarFiles={calendarFiles} hero={hero} />
}

function EventsLoading() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="animate-pulse text-muted-foreground">Loading events...</div>
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

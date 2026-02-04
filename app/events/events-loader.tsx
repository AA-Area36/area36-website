"use client"

import * as React from "react"
import { EventsClient } from "./events-client"
import type { DisplayEvent } from "@/lib/types/recurrence"

export function EventsLoader() {
  const [events, setEvents] = React.useState<DisplayEvent[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    const loadEvents = async () => {
      try {
        const response = await fetch("/api/events")
        if (!response.ok) {
          throw new Error(`Events API error: ${response.status}`)
        }
        const data = (await response.json()) as DisplayEvent[]
        if (active) {
          setEvents(data)
        }
      } catch (err) {
        if (!active) return
        const message = err instanceof Error ? err.message : "Failed to load events"
        setError(message)
        setEvents([])
      }
    }

    loadEvents()
    return () => {
      active = false
    }
  }, [])

  if (!events) {
    return <EventsLoading />
  }

  if (error) {
    console.error("Failed to load events:", error)
  }

  return <EventsClient events={events} />
}

function EventsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading events...</div>
    </div>
  )
}

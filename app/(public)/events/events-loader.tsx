"use client"

import * as React from "react"
import { EventsClient } from "./events-client"
import { getAnnualCalendarFiles, type CalendarFile } from "./calendar-file-actions"
import type { DisplayEvent } from "@/lib/types/recurrence"

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
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    const loadData = async () => {
      try {
        // Load events and calendar files in parallel
        const [eventsResponse, calendarFilesData] = await Promise.all([
          fetch("/api/events"),
          getAnnualCalendarFiles(),
        ])
        
        if (!eventsResponse.ok) {
          throw new Error(`Events API error: ${eventsResponse.status}`)
        }
        
        const eventsData = (await eventsResponse.json()) as DisplayEvent[]
        
        if (active) {
          setEvents(eventsData)
          setCalendarFiles(calendarFilesData)
        }
      } catch (err) {
        if (!active) return
        const message = err instanceof Error ? err.message : "Failed to load events"
        setError(message)
        setEvents([])
      }
    }

    loadData()
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

  return <EventsClient events={events} calendarFiles={calendarFiles} hero={hero} />
}

function EventsLoading() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading events...</div>
    </div>
  )
}

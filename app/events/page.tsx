import { Suspense } from "react"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, asc, gt, and, or, isNull } from "drizzle-orm"
import { EventsClient } from "./events-client"

export const dynamic = "force-dynamic"

async function getApprovedEvents() {
  const db = await getDb()
  // Get yesterday's date - events are only hidden if they ended before today
  // This ensures same-day events still appear (could be ongoing)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]

  return db
    .select()
    .from(events)
    .where(
      and(
        eq(events.status, "approved"),
        or(
          gt(events.endDate, yesterdayStr), // Multi-day: endDate > yesterday (includes today)
          and(isNull(events.endDate), gt(events.date, yesterdayStr)) // Single day: date > yesterday
        )
      )
    )
    .orderBy(asc(events.date))
}

export default async function EventsPage() {
  const approvedEvents = await getApprovedEvents()
  const hcaptchaSiteKey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""

  return (
    <Suspense fallback={<EventsLoading />}>
      <EventsClient events={approvedEvents} hcaptchaSiteKey={hcaptchaSiteKey} />
    </Suspense>
  )
}

function EventsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading events...</div>
    </div>
  )
}

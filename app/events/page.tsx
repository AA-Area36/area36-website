import { Suspense } from "react"
import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, asc, gt, and, or, isNull } from "drizzle-orm"
import { EventsClient } from "./events-client"
import { ReCaptchaProvider } from "@/components/recaptcha-provider"

export const dynamic = "force-dynamic"

async function getApprovedEvents() {
  const db = await getDb()
  // Get today's date in Central time (Area 36 is in Minnesota)
  // This ensures events are shown until the end of the day in their local timezone
  const now = new Date()
  // Format as YYYY-MM-DD in Central time
  const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
  
  // Get yesterday for the comparison (events ending yesterday should be hidden)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

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

  return (
    <ReCaptchaProvider>
      <Suspense fallback={<EventsLoading />}>
        <EventsClient events={approvedEvents} />
      </Suspense>
    </ReCaptchaProvider>
  )
}

function EventsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading events...</div>
    </div>
  )
}

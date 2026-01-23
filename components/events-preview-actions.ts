"use server"

import { getDb } from "@/lib/db"
import { events } from "@/lib/db/schema"
import { eq, asc, gt, and, or, isNull, ne } from "drizzle-orm"
import type { Event } from "@/lib/db/schema"

/**
 * Fetch the next 4 upcoming non-district events
 */
export async function fetchUpcomingEvents(): Promise<Event[]> {
  try {
    const db = await getDb()
    
    // Get yesterday's date in Central time (Area 36 is in Minnesota)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

    const upcomingEvents = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.status, "approved"),
          ne(events.type, "District"), // Exclude District events
          or(
            gt(events.endDate, yesterdayStr),
            and(isNull(events.endDate), gt(events.date, yesterdayStr))
          )
        )
      )
      .orderBy(asc(events.date))
      .limit(4)

    return upcomingEvents
  } catch (error) {
    console.error("Error fetching upcoming events:", error)
    return []
  }
}

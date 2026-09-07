import { recurringOverlapsStart } from "@/lib/events/recurring-window"
import { getDb, schema } from "@/lib/db"
import { and, asc, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm"
import { loadEventRelations } from "@/lib/events/load-event-relations"
import { parseLocalDate } from "@/lib/utils/recurrence"
import { getEventsForDateRange } from "@/lib/utils/event-queries"
import { recordError } from "@/lib/monitoring/errors"

export class DistrictDataUnavailableError extends Error {
  constructor() {
    super("District information is temporarily unavailable")
    this.name = "DistrictDataUnavailableError"
  }
}

function throwDistrictDataUnavailable(
  resource: string,
  districtNumber: number,
  cause: unknown
): never {
  void recordError({
    kind: "D1_QUERY_FAILED",
    route: `/district-site/${districtNumber}/${resource}`,
    error: cause,
    messageOverride: `District ${resource} query failed`,
  })
  throw new DistrictDataUnavailableError()
}

export async function getDistrictPublicEvents(districtNumber: number) {
  try {
    const db = await getDb()
    const now = new Date()
    const todayStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Chicago" })

    const events = await db
      .select()
      .from(schema.events)
      .where(
        and(
          eq(schema.events.status, "approved"),
          eq(schema.events.districtNumber, districtNumber),
          or(
            and(
              eq(schema.events.isRecurring, false),
              or(
                gt(schema.events.endDate, yesterdayStr),
                and(isNull(schema.events.endDate), gt(schema.events.date, yesterdayStr))
              )
            ),
            and(
              eq(schema.events.isRecurring, true),
              recurringOverlapsStart(todayStr)
            )
          )
        )
      )
      .orderBy(asc(schema.events.date))
      .all()

    if (events.length === 0) return []
    const eventsWithRelations = await loadEventRelations(db, events)
    const rangeStart = parseLocalDate(todayStr)
    const rangeEnd = parseLocalDate(todayStr)
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)
    return getEventsForDateRange(eventsWithRelations, rangeStart, rangeEnd)
  } catch (error) {
    throwDistrictDataUnavailable("events", districtNumber, error)
  }
}

export async function getDistrictContacts(districtNumber: number) {
  try {
    const db = await getDb()
    return db
      .select()
      .from(schema.districtContacts)
      .where(eq(schema.districtContacts.districtNumber, districtNumber))
      .orderBy(asc(schema.districtContacts.sortOrder), asc(schema.districtContacts.role))
      .all()
  } catch (error) {
    throwDistrictDataUnavailable("contacts", districtNumber, error)
  }
}

export async function getDistrictPositions(districtNumber: number) {
  try {
    const db = await getDb()
    return db
      .select()
      .from(schema.districtPositions)
      .where(eq(schema.districtPositions.districtNumber, districtNumber))
      .orderBy(asc(schema.districtPositions.sortOrder), asc(schema.districtPositions.title))
      .all()
  } catch (error) {
    throwDistrictDataUnavailable("positions", districtNumber, error)
  }
}

export async function getDistrictPublishedUpdates(districtNumber: number) {
  try {
    const db = await getDb()
    return db
      .select()
      .from(schema.districtUpdates)
      .where(and(eq(schema.districtUpdates.districtNumber, districtNumber), isNotNull(schema.districtUpdates.publishedAt)))
      .orderBy(desc(schema.districtUpdates.publishedAt))
      .all()
  } catch (error) {
    throwDistrictDataUnavailable("updates", districtNumber, error)
  }
}

export async function getDistrictAllUpdates(districtNumber: number) {
  try {
    const db = await getDb()
    return db
      .select()
      .from(schema.districtUpdates)
      .where(eq(schema.districtUpdates.districtNumber, districtNumber))
      .orderBy(desc(schema.districtUpdates.updatedAt))
      .all()
  } catch (error) {
    throwDistrictDataUnavailable("all-updates", districtNumber, error)
  }
}

export async function getDistrictSiteConfig(districtNumber: number) {
  try {
    const db = await getDb()
    return db
      .select({
        districtNumber: schema.districtSites.districtNumber,
        subdomain: schema.districtSites.subdomain,
        displayName: schema.districtSites.displayName,
        enabled: schema.districtSites.enabled,
        mode: schema.districtSites.mode,
        redirectUrl: schema.districtSites.redirectUrl,
        meetingRecurrenceMode: schema.districtSites.meetingRecurrenceMode,
        meetingWeekOfMonth: schema.districtSites.meetingWeekOfMonth,
        meetingWeekday: schema.districtSites.meetingWeekday,
        meetingDayOfMonth: schema.districtSites.meetingDayOfMonth,
        meetingTime: schema.districtSites.meetingTime,
        meetingLocationType: schema.districtSites.meetingLocationType,
        meetingLocationName: schema.districtSites.meetingLocationName,
        meetingAddress: schema.districtSites.meetingAddress,
        meetingLink: schema.districtSites.meetingLink,
        meetingId: schema.districtSites.meetingId,
        meetingPasscode: schema.districtSites.meetingPasscode,
        meetingContactForDetails: schema.districtSites.meetingContactForDetails,
        createdAt: schema.districtSites.createdAt,
        updatedAt: schema.districtSites.updatedAt,
      })
      .from(schema.districtSites)
      .where(eq(schema.districtSites.districtNumber, districtNumber))
      .get()
  } catch {
    try {
      const db = await getDb()
      const legacy = await db
        .select({
          districtNumber: schema.districtSites.districtNumber,
          subdomain: schema.districtSites.subdomain,
          displayName: schema.districtSites.displayName,
          enabled: schema.districtSites.enabled,
          mode: schema.districtSites.mode,
          redirectUrl: schema.districtSites.redirectUrl,
          createdAt: schema.districtSites.createdAt,
          updatedAt: schema.districtSites.updatedAt,
        })
        .from(schema.districtSites)
        .where(eq(schema.districtSites.districtNumber, districtNumber))
        .get()

      if (!legacy) return null
      return {
        ...legacy,
        meetingRecurrenceMode: "weekday_of_month" as const,
        meetingWeekOfMonth: null,
        meetingWeekday: null,
        meetingDayOfMonth: null,
        meetingTime: null,
        meetingLocationType: null,
        meetingLocationName: null,
        meetingAddress: null,
        meetingLink: null,
        meetingId: null,
        meetingPasscode: null,
        meetingContactForDetails: false,
      }
    } catch (error) {
      throwDistrictDataUnavailable("configuration", districtNumber, error)
    }
  }
}

import { getDb, schema } from "@/lib/db"
import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, or } from "drizzle-orm"
import type { EventException, EventFlyer, EventType } from "@/lib/db/schema"
import type { EventWithRelations } from "@/lib/types/recurrence"
import { getEventsForDateRange } from "@/lib/utils/event-queries"

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
              or(isNull(schema.events.recurUntil), gte(schema.events.recurUntil, todayStr))
            )
          )
        )
      )
      .orderBy(asc(schema.events.date))
      .all()

    if (events.length === 0) return []
    const eventIds = events.map((event) => event.id)
    const recurringIds = events.filter((event) => event.isRecurring).map((event) => event.id)
    const [typeRows, flyerRows, exceptionRows] = await Promise.all([
      db.select().from(schema.eventToTypes).where(inArray(schema.eventToTypes.eventId, eventIds)).all(),
      db
        .select()
        .from(schema.eventFlyers)
        .where(inArray(schema.eventFlyers.eventId, eventIds))
        .orderBy(schema.eventFlyers.order)
        .all(),
      recurringIds.length > 0
        ? db.select().from(schema.eventExceptions).where(inArray(schema.eventExceptions.eventId, recurringIds)).all()
        : Promise.resolve([] as EventException[]),
    ])

    const typesByEvent = new Map<string, EventType[]>()
    for (const row of typeRows) {
      const values = typesByEvent.get(row.eventId) ?? []
      values.push(row.type)
      typesByEvent.set(row.eventId, values)
    }
    const flyersByEvent = new Map<string, EventFlyer[]>()
    for (const row of flyerRows) {
      const values = flyersByEvent.get(row.eventId) ?? []
      values.push(row)
      flyersByEvent.set(row.eventId, values)
    }
    const exceptionsByEvent = new Map<string, EventException[]>()
    for (const row of exceptionRows) {
      const values = exceptionsByEvent.get(row.eventId) ?? []
      values.push(row)
      exceptionsByEvent.set(row.eventId, values)
    }

    const eventsWithRelations: EventWithRelations[] = events.map((event) => ({
      ...event,
      types: typesByEvent.get(event.id) ?? (event.type ? [event.type] : []),
      flyers: flyersByEvent.get(event.id) ?? [],
      exceptions: exceptionsByEvent.get(event.id) ?? [],
    }))
    const rangeStart = new Date(todayStr)
    const rangeEnd = new Date(todayStr)
    rangeEnd.setFullYear(rangeEnd.getFullYear() + 1)
    return getEventsForDateRange(eventsWithRelations, rangeStart, rangeEnd)
  } catch {
    return []
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
  } catch {
    return []
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
  } catch {
    return []
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
  } catch {
    return []
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
  } catch {
    return []
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
    } catch {
      return null
    }
  }
}

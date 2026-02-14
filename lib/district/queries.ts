import { getDb, schema } from "@/lib/db"
import { and, asc, desc, eq, isNotNull } from "drizzle-orm"

export async function getDistrictPublicEvents(districtNumber: number) {
  try {
    const db = await getDb()
    return db
      .select()
      .from(schema.events)
      .where(and(eq(schema.events.status, "approved"), eq(schema.events.districtNumber, districtNumber)))
      .orderBy(asc(schema.events.date))
      .all()
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

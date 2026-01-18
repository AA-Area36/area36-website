import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"

// Auth.js tables
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: text("emailVerified"),
  image: text("image"),
})

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  sessionToken: text("sessionToken").notNull().unique(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: text("expires").notNull(),
})

export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: text("expires").notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
)

// Events table
export const eventTypes = [
  "Assembly",
  "Regional",
  "Workshop",
  "Meeting",
  "Committee",
  "District",
] as const

export const eventStatuses = ["pending", "approved", "denied"] as const
export const locationTypes = ["in-person", "hybrid", "online"] as const

export type EventType = (typeof eventTypes)[number]
export type EventStatus = (typeof eventStatuses)[number]
export type LocationType = (typeof locationTypes)[number]

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  endDate: text("end_date"),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  locationType: text("location_type").notNull().default("in-person").$type<LocationType>(),
  address: text("address"),
  meetingLink: text("meeting_link"),
  description: text("description").notNull(),
  type: text("type").notNull().$type<EventType>(),
  status: text("status").notNull().default("pending").$type<EventStatus>(),
  submitterEmail: text("submitter_email").notNull(),
  flyerUrl: text("flyer_url"),
  denialReason: text("denial_reason"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
})

export type Event = typeof events.$inferSelect
export type NewEvent = typeof events.$inferInsert

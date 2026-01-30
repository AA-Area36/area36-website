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
  startTime: text("start_time"),
  endTime: text("end_time"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  locationType: text("location_type").notNull().default("in-person").$type<LocationType>(),
  address: text("address"),
  meetingLink: text("meeting_link"),
  description: text("description").notNull(),
  type: text("type").$type<EventType>(), // Kept for backward compat, use eventToTypes for new events
  status: text("status").notNull().default("pending").$type<EventStatus>(),
  submitterEmail: text("submitter_email").notNull(),
  flyerUrl: text("flyer_url"), // Deprecated: use eventFlyers table
  denialReason: text("denial_reason"),
  // TBD flags
  timeTBD: integer("time_tbd", { mode: "boolean" }).notNull().default(false),
  addressTBD: integer("address_tbd", { mode: "boolean" }).notNull().default(false),
  meetingLinkTBD: integer("meeting_link_tbd", { mode: "boolean" }).notNull().default(false),
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

// Event Flyers table (multiple flyers per event)
export const eventFlyers = sqliteTable("event_flyers", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  fileKey: text("file_key").notNull(), // R2 storage key
  fileName: text("file_name").notNull(),
  fileType: text("file_type").notNull(), // 'image/jpeg', 'application/pdf', etc.
  fileSize: integer("file_size").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type EventFlyer = typeof eventFlyers.$inferSelect
export type NewEventFlyer = typeof eventFlyers.$inferInsert

// Event to Types junction table (many-to-many for multi-select event types)
export const eventToTypes = sqliteTable(
  "event_to_types",
  {
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<EventType>(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.type] })]
)

export type EventToType = typeof eventToTypes.$inferSelect
export type NewEventToType = typeof eventToTypes.$inferInsert

// Subscription Drives tables
export const driveSubmissionStatuses = ["pending", "approved", "denied"] as const
export type DriveSubmissionStatus = (typeof driveSubmissionStatuses)[number]

export const subscriptionDrives = sqliteTable("subscription_drives", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  prizeDescription: text("prize_description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export const driveSubmissions = sqliteTable("drive_submissions", {
  id: text("id").primaryKey(),
  driveId: text("drive_id").references(() => subscriptionDrives.id),
  district: text("district").notNull(),
  subscriptionCount: integer("subscription_count").notNull(),
  confirmationImageKey: text("confirmation_image_key").notNull(),
  status: text("status").notNull().default("pending").$type<DriveSubmissionStatus>(),
  denialReason: text("denial_reason"),
  submitterContact: text("submitter_contact"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: text("reviewed_at"),
  submittedAt: text("submitted_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type SubscriptionDrive = typeof subscriptionDrives.$inferSelect
export type NewSubscriptionDrive = typeof subscriptionDrives.$inferInsert
export type DriveSubmission = typeof driveSubmissions.$inferSelect
export type NewDriveSubmission = typeof driveSubmissions.$inferInsert

// Recording Folders table (password-protected recording folders)
export const recordingFolders = sqliteTable("recording_folders", {
  id: text("id").primaryKey(),
  driveId: text("drive_id").notNull().unique(), // Google Drive folder ID
  folderName: text("folder_name").notNull(),
  password: text("password").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type RecordingFolder = typeof recordingFolders.$inferSelect
export type NewRecordingFolder = typeof recordingFolders.$inferInsert

// File Metadata table (custom display names and password protection for files)
export const fileMetadata = sqliteTable("file_metadata", {
  id: text("id").primaryKey(),
  driveId: text("drive_id").notNull().unique(), // Google Drive file ID
  parentFolderId: text("parent_folder_id").notNull(), // Parent folder ID for querying
  displayName: text("display_name").notNull(),
  password: text("password"), // null = no password protection
  category: text("category"), // null = no category, used for grouping files
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type FileMetadata = typeof fileMetadata.$inferSelect
export type NewFileMetadata = typeof fileMetadata.$inferInsert

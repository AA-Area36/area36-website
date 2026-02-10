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
export const recurrenceTypes = ["none", "weekly", "monthly"] as const
export const monthlyPatternTypes = ["dayOfMonth", "dayOfWeek"] as const
export const exceptionTypes = ["cancelled", "modified"] as const

export type EventType = (typeof eventTypes)[number]
export type EventStatus = (typeof eventStatuses)[number]
export type LocationType = (typeof locationTypes)[number]
export type RecurrenceType = (typeof recurrenceTypes)[number]
export type MonthlyPatternType = (typeof monthlyPatternTypes)[number]
export type ExceptionType = (typeof exceptionTypes)[number]

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
  // Optional district scope for district sub-sites (null = Area-level / general)
  districtNumber: integer("district_number"),
  type: text("type").$type<EventType>(), // Kept for backward compat, use eventToTypes for new events
  status: text("status").notNull().default("pending").$type<EventStatus>(),
  submitterEmail: text("submitter_email").notNull(),
  flyerUrl: text("flyer_url"), // Deprecated: use eventFlyers table
  denialReason: text("denial_reason"),
  // TBD flags
  timeTBD: integer("time_tbd", { mode: "boolean" }).notNull().default(false),
  addressTBD: integer("address_tbd", { mode: "boolean" }).notNull().default(false),
  meetingLinkTBD: integer("meeting_link_tbd", { mode: "boolean" }).notNull().default(false),
  // Recurrence fields
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  recurrenceType: text("recurrence_type").$type<RecurrenceType>().default("none"),
  recurrencePattern: text("recurrence_pattern"), // JSON: weekly days [0-6] array
  monthlyPatternType: text("monthly_pattern_type").$type<MonthlyPatternType>(),
  monthlyPatternValue: text("monthly_pattern_value"), // JSON: day number or {week, day}
  recurUntil: text("recur_until"), // YYYY-MM-DD end date for recurrence
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

/* -------------------------------------------------------------------------- */
/*                               District Sites                               */
/* -------------------------------------------------------------------------- */

export const districtSiteModes = ["hosted", "external_redirect"] as const
export type DistrictSiteMode = (typeof districtSiteModes)[number]

export const districtSites = sqliteTable("district_sites", {
  districtNumber: integer("district_number").primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  displayName: text("display_name").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  mode: text("mode").notNull().$type<DistrictSiteMode>(),
  redirectUrl: text("redirect_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type DistrictSite = typeof districtSites.$inferSelect
export type NewDistrictSite = typeof districtSites.$inferInsert

export const districtAdminRoles = ["manager", "editor"] as const
export type DistrictAdminRole = (typeof districtAdminRoles)[number]

export const districtAdmins = sqliteTable(
  "district_admins",
  {
    districtNumber: integer("district_number")
      .notNull()
      .references(() => districtSites.districtNumber, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role").notNull().default("editor").$type<DistrictAdminRole>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [primaryKey({ columns: [table.districtNumber, table.email] })]
)

export type DistrictAdmin = typeof districtAdmins.$inferSelect
export type NewDistrictAdmin = typeof districtAdmins.$inferInsert

export const districtContactCategories = ["officer", "chair", "other"] as const
export type DistrictContactCategory = (typeof districtContactCategories)[number]

export const districtContacts = sqliteTable("district_contacts", {
  id: text("id").primaryKey(),
  districtNumber: integer("district_number")
    .notNull()
    .references(() => districtSites.districtNumber, { onDelete: "cascade" }),
  category: text("category").notNull().default("other").$type<DistrictContactCategory>(),
  role: text("role").notNull(),
  name: text("name"),
  email: text("email"),
  phone: text("phone"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type DistrictContact = typeof districtContacts.$inferSelect
export type NewDistrictContact = typeof districtContacts.$inferInsert

export const districtPositionStatuses = ["open", "filled"] as const
export type DistrictPositionStatus = (typeof districtPositionStatuses)[number]

export const districtPositions = sqliteTable("district_positions", {
  id: text("id").primaryKey(),
  districtNumber: integer("district_number")
    .notNull()
    .references(() => districtSites.districtNumber, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: text("status").notNull().default("open").$type<DistrictPositionStatus>(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type DistrictPosition = typeof districtPositions.$inferSelect
export type NewDistrictPosition = typeof districtPositions.$inferInsert

export const districtUpdates = sqliteTable("district_updates", {
  id: text("id").primaryKey(),
  districtNumber: integer("district_number")
    .notNull()
    .references(() => districtSites.districtNumber, { onDelete: "cascade" }),
  committee: text("committee"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  publishedAt: text("published_at"),
  authorEmail: text("author_email"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
})

export type DistrictUpdate = typeof districtUpdates.$inferSelect
export type NewDistrictUpdate = typeof districtUpdates.$inferInsert

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

// Event Exceptions table (for recurring events - modified or cancelled occurrences)
export const eventExceptions = sqliteTable("event_exceptions", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  occurrenceDate: text("occurrence_date").notNull(), // YYYY-MM-DD - the specific occurrence this exception applies to
  exceptionType: text("exception_type").notNull().$type<ExceptionType>(),
  // Override fields (null = use parent event value)
  title: text("title"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  endDate: text("end_date"), // For multi-day occurrence overrides
  locationType: text("location_type").$type<LocationType>(),
  address: text("address"),
  meetingLink: text("meeting_link"),
  description: text("description"),
  timeTBD: integer("time_tbd", { mode: "boolean" }),
  addressTBD: integer("address_tbd", { mode: "boolean" }),
  meetingLinkTBD: integer("meeting_link_tbd", { mode: "boolean" }),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  createdBy: text("created_by"),
})

export type EventException = typeof eventExceptions.$inferSelect
export type NewEventException = typeof eventExceptions.$inferInsert

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

// Monitoring tables
export const uptimeDaily = sqliteTable(
  "uptime_daily",
  {
    day: text("day").notNull(),
    endpoint: text("endpoint").notNull(),
    checksTotal: integer("checks_total").notNull().default(0),
    checksOk: integer("checks_ok").notNull().default(0),
    latencyMsSum: integer("latency_ms_sum").notNull().default(0),
    latencyMsMax: integer("latency_ms_max").notNull().default(0),
    lastStatus: integer("last_status"),
    lastCheckedAt: text("last_checked_at"),
  },
  (table) => [primaryKey({ columns: [table.day, table.endpoint] })]
)

export type UptimeDaily = typeof uptimeDaily.$inferSelect
export type NewUptimeDaily = typeof uptimeDaily.$inferInsert

export const errorsDaily = sqliteTable(
  "errors_daily",
  {
    day: text("day").notNull(),
    errorKind: text("error_kind").notNull(),
    fingerprint: text("fingerprint").notNull(),
    count: integer("count").notNull().default(0),
    sampleMessage: text("sample_message"),
    sampleRoute: text("sample_route"),
    lastSeenAt: text("last_seen_at"),
  },
  (table) => [primaryKey({ columns: [table.day, table.errorKind, table.fingerprint] })]
)

export type ErrorsDaily = typeof errorsDaily.$inferSelect
export type NewErrorsDaily = typeof errorsDaily.$inferInsert

export const reportsMonthly = sqliteTable("reports_monthly", {
  month: text("month").primaryKey(),
  generatedAt: text("generated_at").notNull(),
  subject: text("subject").notNull(),
  r2KeyHtml: text("r2_key_html"),
  r2KeyJson: text("r2_key_json"),
})

export type ReportsMonthly = typeof reportsMonthly.$inferSelect
export type NewReportsMonthly = typeof reportsMonthly.$inferInsert

// Site content documents (i18n + editable content).
export const contentDocuments = sqliteTable(
  "content_documents",
  {
    scope: text("scope").notNull(),
    locale: text("locale").notNull(),
    draftJson: text("draft_json"),
    publishedJson: text("published_json"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    draftUpdatedAt: text("draft_updated_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    publishedAt: text("published_at"),
    updatedBy: text("updated_by"),
  },
  (table) => [primaryKey({ columns: [table.scope, table.locale] })]
)

export type ContentDocument = typeof contentDocuments.$inferSelect
export type NewContentDocument = typeof contentDocuments.$inferInsert

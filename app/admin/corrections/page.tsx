import { redirect } from "next/navigation"
import { asc, desc, eq } from "drizzle-orm"
import { getSession } from "@/lib/auth"
import { hasPermission } from "@/lib/auth/rbac"
import { requireCorrectionsWriteSession } from "@/lib/auth/guards"
import { getDb } from "@/lib/db"
import {
  correctionsContacts,
  correctionsMatches,
  correctionsRecipients,
  type CorrectionsContact,
  type CorrectionsRecipient,
} from "@/lib/db/schema"
import { CorrectionsAdminClient, type RecipientMatchSummary, type SummaryMetric } from "./corrections-admin-client"

export const dynamic = "force-dynamic"

type PageSearchParams = Record<string, string | string[] | undefined>

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null

  const raw = value.trim()
  if (!raw) return null

  const normalized = raw.includes("T")
    ? raw
    : `${raw.replace(" ", "T")}${raw.endsWith("Z") ? "" : "Z"}`

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function buildMetric<T>(
  items: T[],
  predicate: (item: T) => boolean,
  getCreatedAt: (item: T) => string | null | undefined,
  currentMonthStart: Date,
  previousMonthStart: Date
): Pick<SummaryMetric, "current" | "monthCurrent" | "monthPrevious" | "delta"> {
  const current = items.filter(predicate).length

  const monthCurrent = items.filter((item) => {
    if (!predicate(item)) return false
    const createdAt = parseTimestamp(getCreatedAt(item))
    if (!createdAt) return false
    return createdAt >= currentMonthStart
  }).length

  const monthPrevious = items.filter((item) => {
    if (!predicate(item)) return false
    const createdAt = parseTimestamp(getCreatedAt(item))
    if (!createdAt) return false
    return createdAt >= previousMonthStart && createdAt < currentMonthStart
  }).length

  return {
    current,
    monthCurrent,
    monthPrevious,
    delta: monthCurrent - monthPrevious,
  }
}

export default async function CorrectionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>
}) {
  const session = await getSession()
  if (!session?.user?.email) {
    redirect("/admin/login?callbackUrl=/admin/corrections")
  }

  const canView = session.user.isAreaAdmin || (await hasPermission(session, "corrections:view"))
  if (!canView) {
    redirect("/admin/login?callbackUrl=/admin/corrections")
  }

  const canEdit = !!(await requireCorrectionsWriteSession())
  const resolvedSearchParams = (await searchParams) ?? {}

  const db = await getDb()
  const [contacts, recipients, activeMatches] = await Promise.all([
    db
      .select()
      .from(correctionsContacts)
      .orderBy(desc(correctionsContacts.active), asc(correctionsContacts.lastName), asc(correctionsContacts.firstName))
      .all(),
    db
      .select()
      .from(correctionsRecipients)
      .orderBy(desc(correctionsRecipients.createdAt), asc(correctionsRecipients.lastName), asc(correctionsRecipients.firstName))
      .all(),
    db
      .select({
        recipientId: correctionsMatches.recipientId,
        contactId: correctionsMatches.contactId,
        contactFirstName: correctionsContacts.firstName,
        contactLastName: correctionsContacts.lastName,
        matchedAt: correctionsMatches.matchedAt,
      })
      .from(correctionsMatches)
      .innerJoin(correctionsContacts, eq(correctionsContacts.id, correctionsMatches.contactId))
      .where(eq(correctionsMatches.isActive, true))
      .all(),
  ])

  const matchSummaries: RecipientMatchSummary[] = activeMatches.map((row) => ({
    recipientId: row.recipientId,
    contactId: row.contactId,
    contactName: `${row.contactFirstName} ${row.contactLastName}`,
    matchedAt: row.matchedAt,
  }))

  const now = new Date()
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const contactsMetrics: SummaryMetric[] = [
    {
      key: "totalContacts",
      label: "Total Contacts",
      ...buildMetric<CorrectionsContact>(
        contacts,
        () => true,
        (contact) => contact.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
    {
      key: "inactiveContacts",
      label: "Inactive Contacts",
      ...buildMetric<CorrectionsContact>(
        contacts,
        (contact) => !contact.active,
        (contact) => contact.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
    {
      key: "femaleContacts",
      label: "Female Contacts",
      ...buildMetric<CorrectionsContact>(
        contacts,
        (contact) => {
          const g = String(contact.gender ?? "").trim().toLowerCase()
          return g === "female" || g === "f" || g === "woman" || g === "women"
        },
        (contact) => contact.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
    {
      key: "maleContacts",
      label: "Male Contacts",
      ...buildMetric<CorrectionsContact>(
        contacts,
        (contact) => {
          const g = String(contact.gender ?? "").trim().toLowerCase()
          return g === "male" || g === "m" || g === "man" || g === "men"
        },
        (contact) => contact.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
  ]

  const recipientMetrics: SummaryMetric[] = [
    {
      key: "unmatchedRecipients",
      label: "Unmatched",
      ...buildMetric<CorrectionsRecipient>(
        recipients,
        (recipient) => recipient.status === "unmatched",
        (recipient) => recipient.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
    {
      key: "pendingRecipients",
      label: "Pending",
      ...buildMetric<CorrectionsRecipient>(
        recipients,
        (recipient) => recipient.status === "pending",
        (recipient) => recipient.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
    {
      key: "completedRecipients",
      label: "Completed",
      ...buildMetric<CorrectionsRecipient>(
        recipients,
        (recipient) => recipient.status === "completed",
        (recipient) => recipient.createdAt,
        currentMonthStart,
        previousMonthStart
      ),
    },
  ]

  return (
    <CorrectionsAdminClient
      contacts={contacts}
      recipients={recipients}
      activeMatches={matchSummaries}
      contactsMetrics={contactsMetrics}
      recipientMetrics={recipientMetrics}
      canEdit={canEdit}
      initialSearchParams={resolvedSearchParams}
    />
  )
}

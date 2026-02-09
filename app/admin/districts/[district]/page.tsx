import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { eq, and, sql } from "drizzle-orm"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictAdminDashboard({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const db = await getDb()

  const [eventsCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.events)
    .where(eq(schema.events.districtNumber, districtNumber))

  const [contactsCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.districtContacts)
    .where(eq(schema.districtContacts.districtNumber, districtNumber))

  const [openPositionsCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.districtPositions)
    .where(and(eq(schema.districtPositions.districtNumber, districtNumber), eq(schema.districtPositions.status, "open")))

  const [publishedUpdatesCountRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.districtUpdates)
    .where(and(eq(schema.districtUpdates.districtNumber, districtNumber), sql`published_at IS NOT NULL`))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">District content overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Events</div>
          <div className="mt-1 text-3xl font-semibold">{eventsCountRow?.count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Contacts</div>
          <div className="mt-1 text-3xl font-semibold">{contactsCountRow?.count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Open Positions</div>
          <div className="mt-1 text-3xl font-semibold">{openPositionsCountRow?.count ?? 0}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs text-muted-foreground">Published Updates</div>
          <div className="mt-1 text-3xl font-semibold">{publishedUpdatesCountRow?.count ?? 0}</div>
        </div>
      </div>
    </div>
  )
}


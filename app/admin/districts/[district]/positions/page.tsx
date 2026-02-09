import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { createDistrictPosition, updateDistrictPosition, deleteDistrictPosition } from "./actions"
import { districtPositionStatuses } from "@/lib/db/schema"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictPositionsAdminPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const db = await getDb()
  const positions = await db
    .select()
    .from(schema.districtPositions)
    .where(eq(schema.districtPositions.districtNumber, districtNumber))
    .orderBy(asc(schema.districtPositions.sortOrder), asc(schema.districtPositions.title))
    .all()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Positions</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage district service opportunities.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Add position</h2>
        <form action={createDistrictPosition} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="districtNumber" value={districtNumber} />
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Title</label>
            <input name="title" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="GSR Workshop Coordinator" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Status</label>
            <select name="status" defaultValue="open" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
              {districtPositionStatuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Sort order</label>
            <input name="sortOrder" defaultValue="0" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Contact name</label>
            <input name="contactName" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Contact email</label>
            <input name="contactEmail" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Notes</label>
            <textarea name="notes" className="mt-1 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Create
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Positions</h2>
        </div>
        {positions.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">No positions yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {positions.map((p) => (
              <details key={p.id} className="px-6 py-4">
                <summary className="cursor-pointer select-none">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.status} • sort {p.sortOrder}</div>
                  </div>
                  {p.contactEmail && <div className="mt-1 text-xs text-muted-foreground">{p.contactEmail}</div>}
                </summary>

                <form action={updateDistrictPosition} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={p.id} />
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground">Title</label>
                    <input name="title" defaultValue={p.title} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Status</label>
                    <select name="status" defaultValue={p.status} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                      {districtPositionStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Sort order</label>
                    <input name="sortOrder" defaultValue={String(p.sortOrder)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Contact name</label>
                    <input name="contactName" defaultValue={p.contactName ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Contact email</label>
                    <input name="contactEmail" defaultValue={p.contactEmail ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground">Notes</label>
                    <textarea name="notes" defaultValue={p.notes ?? ""} className="mt-1 min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                      Save
                    </button>
                  </div>
                </form>

                <form action={deleteDistrictPosition} className="mt-3">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="h-9 rounded-md border border-border bg-background px-4 text-sm">
                    Delete position
                  </button>
                </form>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

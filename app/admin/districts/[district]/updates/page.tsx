import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { desc, eq } from "drizzle-orm"
import {
  createDistrictUpdate,
  updateDistrictUpdate,
  publishDistrictUpdate,
  unpublishDistrictUpdate,
  deleteDistrictUpdate,
} from "./actions"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictUpdatesAdminPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const db = await getDb()
  const updates = await db
    .select()
    .from(schema.districtUpdates)
    .where(eq(schema.districtUpdates.districtNumber, districtNumber))
    .orderBy(desc(schema.districtUpdates.updatedAt))
    .all()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">Draft and publish committee updates for the district site.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">New update</h2>
        <form action={createDistrictUpdate} className="mt-4 grid gap-3">
          <input type="hidden" name="districtNumber" value={districtNumber} />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Committee (optional)</label>
              <input name="committee" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="PI Committee" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Title</label>
              <input name="title" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Body</label>
            <textarea name="body" className="mt-1 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Create draft
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Updates</h2>
        </div>
        {updates.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">No updates yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {updates.map((u) => (
              <details key={u.id} className="px-6 py-4">
                <summary className="cursor-pointer select-none">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="font-medium">{u.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {u.publishedAt ? `Published ${u.publishedAt}` : "Draft"} • Updated {u.updatedAt}
                    </div>
                  </div>
                  {u.committee && <div className="mt-1 text-xs text-muted-foreground">{u.committee}</div>}
                </summary>

                <form action={updateDistrictUpdate} className="mt-4 grid gap-3">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={u.id} />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">Committee</label>
                      <input name="committee" defaultValue={u.committee ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">Title</label>
                      <input name="title" defaultValue={u.title} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Body</label>
                    <textarea name="body" defaultValue={u.body} className="mt-1 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                      Save
                    </button>
                  </div>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {u.publishedAt ? (
                    <form action={unpublishDistrictUpdate}>
                      <input type="hidden" name="districtNumber" value={districtNumber} />
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="h-9 rounded-md border border-border bg-background px-4 text-sm">
                        Unpublish
                      </button>
                    </form>
                  ) : (
                    <form action={publishDistrictUpdate}>
                      <input type="hidden" name="districtNumber" value={districtNumber} />
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="h-9 rounded-md border border-border bg-background px-4 text-sm">
                        Publish
                      </button>
                    </form>
                  )}
                  <form action={deleteDistrictUpdate}>
                    <input type="hidden" name="districtNumber" value={districtNumber} />
                    <input type="hidden" name="id" value={u.id} />
                    <button type="submit" className="h-9 rounded-md border border-border bg-background px-4 text-sm">
                      Delete
                    </button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { createDistrictEvent, updateDistrictEvent, deleteDistrictEvent } from "./actions"
import { eventTypes, locationTypes } from "@/lib/db/schema"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

export default async function DistrictCalendarAdminPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const db = await getDb()
  const events = await db
    .select()
    .from(schema.events)
    .where(eq(schema.events.districtNumber, districtNumber))
    .orderBy(asc(schema.events.date))
    .all()

  const typesRows = await db.select().from(schema.eventToTypes).all()
  const typesMap = new Map<string, string[]>()
  for (const r of typesRows) {
    const existing = typesMap.get(r.eventId) || []
    existing.push(r.type)
    typesMap.set(r.eventId, existing)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create and edit district events shown on the district site.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Add event</h2>
        <form action={createDistrictEvent} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="districtNumber" value={districtNumber} />
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Title</label>
            <input name="title" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Date (YYYY-MM-DD)</label>
            <input name="date" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="2026-03-21" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground">Start</label>
              <input name="startTime" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="09:00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground">End</label>
              <input name="endTime" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="16:00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Location type</label>
            <select name="locationType" defaultValue="in-person" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
              {locationTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Timezone</label>
            <input name="timezone" defaultValue="America/Chicago" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Address</label>
            <input name="address" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Meeting link</label>
            <input name="meetingLink" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Types (comma-separated)</label>
            <input name="types" defaultValue="District" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder={eventTypes.join(", ")} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Description</label>
            <textarea name="description" className="mt-1 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Create
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">
          Types must be one of: {eventTypes.join(", ")}.
        </p>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Events</h2>
        </div>
        {events.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">No events yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {events.map((e) => {
              const types = typesMap.get(e.id) ?? (e.type ? [e.type] : [])
              return (
                <details key={e.id} className="px-6 py-4">
                  <summary className="cursor-pointer select-none">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <div className="font-medium">{e.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {e.date}{e.startTime ? ` • ${e.startTime}` : ""}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {types.length ? `Types: ${types.join(", ")}` : "No types set"} • Status: {e.status}
                    </div>
                  </summary>

                  <form action={updateDistrictEvent} className="mt-4 grid gap-3 md:grid-cols-2">
                    <input type="hidden" name="districtNumber" value={districtNumber} />
                    <input type="hidden" name="eventId" value={e.id} />
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground">Title</label>
                      <input name="title" defaultValue={e.title} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">Date</label>
                      <input name="date" defaultValue={e.date} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground">Start</label>
                        <input name="startTime" defaultValue={e.startTime ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-muted-foreground">End</label>
                        <input name="endTime" defaultValue={e.endTime ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">Location type</label>
                      <select name="locationType" defaultValue={e.locationType} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                        {locationTypes.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground">Timezone</label>
                      <input name="timezone" defaultValue={e.timezone} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground">Address</label>
                      <input name="address" defaultValue={e.address ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground">Meeting link</label>
                      <input name="meetingLink" defaultValue={e.meetingLink ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground">Types</label>
                      <input name="types" defaultValue={types.join(", ") || "District"} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground">Description</label>
                      <textarea name="description" defaultValue={e.description} className="mt-1 min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                        Save
                      </button>
                    </div>
                  </form>
                  <form action={deleteDistrictEvent} className="mt-3">
                    <input type="hidden" name="districtNumber" value={districtNumber} />
                    <input type="hidden" name="eventId" value={e.id} />
                    <button type="submit" className="h-9 rounded-md border border-border bg-background px-4 text-sm">
                      Delete event
                    </button>
                  </form>
                </details>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

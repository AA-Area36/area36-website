import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { createDistrictEvent, updateDistrictEvent, deleteDistrictEvent } from "./actions"
import { locationTypes, type LocationType } from "@/lib/db/schema"
import { TIMEZONES } from "@/lib/timezone"
import { FormSubmitButton } from "@/components/form-submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EventTypesField } from "./event-types-field"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Calendar" }

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

const locationTypeLabels: Record<LocationType, string> = {
  "in-person": "In Person",
  hybrid: "Hybrid",
  online: "Online",
}

function getTimezoneOptions(selectedTimezone: string) {
  if (TIMEZONES.some((tz) => tz.value === selectedTimezone)) {
    return TIMEZONES
  }

  return [{ value: selectedTimezone, label: selectedTimezone }, ...TIMEZONES]
}

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
            <Label htmlFor="new-event-title" className="text-xs font-medium text-muted-foreground">
              Title
            </Label>
            <Input id="new-event-title" name="title" className="mt-1" maxLength={200} required />
          </div>
          <div>
            <Label htmlFor="new-event-date" className="text-xs font-medium text-muted-foreground">
              Date
            </Label>
            <Input id="new-event-date" name="date" type="date" className="mt-1" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="new-event-start-time" className="text-xs font-medium text-muted-foreground">
                Start
              </Label>
              <Input id="new-event-start-time" name="startTime" type="time" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="new-event-end-time" className="text-xs font-medium text-muted-foreground">
                End
              </Label>
              <Input id="new-event-end-time" name="endTime" type="time" className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="new-event-location-type" className="text-xs font-medium text-muted-foreground">
              Location type
            </Label>
            <Select name="locationType" defaultValue="in-person">
              <SelectTrigger id="new-event-location-type" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {locationTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-event-timezone" className="text-xs font-medium text-muted-foreground">
              Timezone
            </Label>
            <Select name="timezone" defaultValue="America/Chicago">
              <SelectTrigger id="new-event-timezone" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="new-event-address" className="text-xs font-medium text-muted-foreground">
              Address
            </Label>
            <Input id="new-event-address" name="address" className="mt-1" maxLength={500} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="new-event-link" className="text-xs font-medium text-muted-foreground">
              Meeting link
            </Label>
            <Input id="new-event-link" name="meetingLink" type="url" className="mt-1" maxLength={2048} />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Types</Label>
            <div className="mt-1">
              <EventTypesField name="types" defaultValue="District" />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="new-event-description" className="text-xs font-medium text-muted-foreground">
              Description
            </Label>
            <Textarea id="new-event-description" name="description" className="mt-1 min-h-28" maxLength={4000} required />
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton pendingText="Creating...">Create</FormSubmitButton>
          </div>
        </form>
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
              const timezoneOptions = getTimezoneOptions(e.timezone)

              return (
                <details key={e.id} className="px-6 py-4">
                  <summary className="cursor-pointer select-none">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <div className="font-medium">{e.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {e.date}
                        {e.startTime ? ` • ${e.startTime}` : ""}
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
                      <Label htmlFor={`event-title-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Title
                      </Label>
                      <Input id={`event-title-${e.id}`} name="title" defaultValue={e.title} className="mt-1" maxLength={200} required />
                    </div>
                    <div>
                      <Label htmlFor={`event-date-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Date
                      </Label>
                      <Input id={`event-date-${e.id}`} name="date" type="date" defaultValue={e.date} className="mt-1" required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor={`event-start-${e.id}`} className="text-xs font-medium text-muted-foreground">
                          Start
                        </Label>
                        <Input
                          id={`event-start-${e.id}`}
                          name="startTime"
                          type="time"
                          defaultValue={e.startTime ?? ""}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`event-end-${e.id}`} className="text-xs font-medium text-muted-foreground">
                          End
                        </Label>
                        <Input
                          id={`event-end-${e.id}`}
                          name="endTime"
                          type="time"
                          defaultValue={e.endTime ?? ""}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor={`event-location-type-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Location type
                      </Label>
                      <Select name="locationType" defaultValue={e.locationType}>
                        <SelectTrigger id={`event-location-type-${e.id}`} className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {locationTypes.map((t) => (
                            <SelectItem key={t} value={t}>
                              {locationTypeLabels[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`event-timezone-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Timezone
                      </Label>
                      <Select name="timezone" defaultValue={e.timezone}>
                        <SelectTrigger id={`event-timezone-${e.id}`} className="mt-1 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezoneOptions.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`event-address-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Address
                      </Label>
                      <Input id={`event-address-${e.id}`} name="address" defaultValue={e.address ?? ""} className="mt-1" maxLength={500} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`event-link-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Meeting link
                      </Label>
                      <Input
                        id={`event-link-${e.id}`}
                        name="meetingLink"
                        type="url"
                        defaultValue={e.meetingLink ?? ""}
                        className="mt-1"
                        maxLength={2048}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground">Types</Label>
                      <div className="mt-1">
                        <EventTypesField name="types" defaultValue={types.join(", ") || "District"} />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`event-description-${e.id}`} className="text-xs font-medium text-muted-foreground">
                        Description
                      </Label>
                      <Textarea
                        id={`event-description-${e.id}`}
                        name="description"
                        defaultValue={e.description}
                        className="mt-1 min-h-28"
                        maxLength={4000}
                        required
                      />
                    </div>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <FormSubmitButton pendingText="Saving...">Save</FormSubmitButton>
                    </div>
                  </form>
                  <form action={deleteDistrictEvent} className="mt-3">
                    <input type="hidden" name="districtNumber" value={districtNumber} />
                    <input type="hidden" name="eventId" value={e.id} />
                    <FormSubmitButton type="submit" variant="outline" pendingText="Deleting...">
                      Delete event
                    </FormSubmitButton>
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

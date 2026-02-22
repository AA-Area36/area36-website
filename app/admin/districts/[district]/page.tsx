import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { eq, and, sql } from "drizzle-orm"
import { FormSubmitButton } from "@/components/form-submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { locationTypes, type LocationType } from "@/lib/db/schema"
import { updateDistrictMonthlyMeetingSettings } from "./actions"
import { getDistrictSiteConfig } from "@/lib/district/queries"

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
  const site = await getDistrictSiteConfig(districtNumber)

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

  const recurrenceMode = site?.meetingRecurrenceMode ?? "weekday_of_month"
  const meetingWeekOfMonth = String(site?.meetingWeekOfMonth ?? 1)
  const meetingWeekday = String(site?.meetingWeekday ?? 2)
  const meetingDayOfMonth = String(site?.meetingDayOfMonth ?? 1)
  const meetingTime = site?.meetingTime ?? ""
  const meetingLocationType = (site?.meetingLocationType ?? "in-person") as LocationType
  const meetingLocationName = site?.meetingLocationName ?? ""
  const meetingAddress = site?.meetingAddress ?? ""
  const meetingLink = site?.meetingLink ?? ""
  const meetingId = site?.meetingId ?? ""
  const meetingPasscode = site?.meetingPasscode ?? ""
  const meetingContactForDetails = site?.meetingContactForDetails ?? false
  const locationTypeLabels: Record<LocationType, string> = {
    "in-person": "In person",
    hybrid: "Hybrid",
    online: "Online",
  }

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

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Monthly District Meeting</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the recurring monthly district meeting details shown on the public district page.
        </p>

        <form action={updateDistrictMonthlyMeetingSettings} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="districtNumber" value={districtNumber} />

          <div>
            <Label htmlFor="meeting-recurrence-mode" className="text-xs font-medium text-muted-foreground">
              Recurrence pattern
            </Label>
            <Select name="meetingRecurrenceMode" defaultValue={recurrenceMode}>
              <SelectTrigger id="meeting-recurrence-mode" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekday_of_month">Every X weekday of month (for example 3rd Wednesday)</SelectItem>
                <SelectItem value="day_of_month">Every # day of month (for example 15th)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="meeting-time" className="text-xs font-medium text-muted-foreground">
              Meeting time
            </Label>
            <Input id="meeting-time" name="meetingTime" type="time" defaultValue={meetingTime} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="meeting-week-of-month" className="text-xs font-medium text-muted-foreground">
              Week of month (for weekday pattern)
            </Label>
            <Select name="meetingWeekOfMonth" defaultValue={meetingWeekOfMonth}>
              <SelectTrigger id="meeting-week-of-month" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st</SelectItem>
                <SelectItem value="2">2nd</SelectItem>
                <SelectItem value="3">3rd</SelectItem>
                <SelectItem value="4">4th</SelectItem>
                <SelectItem value="5">5th</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="meeting-weekday" className="text-xs font-medium text-muted-foreground">
              Weekday (for weekday pattern)
            </Label>
            <Select name="meetingWeekday" defaultValue={meetingWeekday}>
              <SelectTrigger id="meeting-weekday" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sunday</SelectItem>
                <SelectItem value="1">Monday</SelectItem>
                <SelectItem value="2">Tuesday</SelectItem>
                <SelectItem value="3">Wednesday</SelectItem>
                <SelectItem value="4">Thursday</SelectItem>
                <SelectItem value="5">Friday</SelectItem>
                <SelectItem value="6">Saturday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="meeting-day-of-month" className="text-xs font-medium text-muted-foreground">
              Day of month (for day-number pattern)
            </Label>
            <Input
              id="meeting-day-of-month"
              name="meetingDayOfMonth"
              type="number"
              min={1}
              max={31}
              defaultValue={meetingDayOfMonth}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="meeting-location-type" className="text-xs font-medium text-muted-foreground">
              Meeting type
            </Label>
            <Select name="meetingLocationType" defaultValue={meetingLocationType}>
              <SelectTrigger id="meeting-location-type" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {locationTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {locationTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="meeting-location-name" className="text-xs font-medium text-muted-foreground">
              Location name
            </Label>
            <Input id="meeting-location-name" name="meetingLocationName" defaultValue={meetingLocationName} className="mt-1" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="meeting-address" className="text-xs font-medium text-muted-foreground">
              Address
            </Label>
            <Input id="meeting-address" name="meetingAddress" defaultValue={meetingAddress} className="mt-1" />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="meeting-link" className="text-xs font-medium text-muted-foreground">
              Online meeting link
            </Label>
            <Input id="meeting-link" name="meetingLink" type="url" defaultValue={meetingLink} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="meeting-id" className="text-xs font-medium text-muted-foreground">
              Meeting ID
            </Label>
            <Input id="meeting-id" name="meetingId" defaultValue={meetingId} className="mt-1" />
          </div>

          <div>
            <Label htmlFor="meeting-passcode" className="text-xs font-medium text-muted-foreground">
              Meeting passcode
            </Label>
            <Input id="meeting-passcode" name="meetingPasscode" defaultValue={meetingPasscode} className="mt-1" />
          </div>

          <div className="md:col-span-2 flex items-center gap-2 pt-1 text-sm">
            <input
              id="meeting-contact-for-details"
              name="meetingContactForDetails"
              type="checkbox"
              defaultChecked={meetingContactForDetails}
              className="h-4 w-4 rounded border border-border"
            />
            <Label htmlFor="meeting-contact-for-details" className="cursor-pointer font-normal">
              Show "Contact DCM" in public card and hide online link, meeting ID, and passcode (in-person location still shows)
            </Label>
          </div>

          <div className="md:col-span-2">
            <FormSubmitButton pendingText="Saving...">Save monthly meeting settings</FormSubmitButton>
          </div>
        </form>
      </section>
    </div>
  )
}

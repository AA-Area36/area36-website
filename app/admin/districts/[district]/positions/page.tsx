import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { createDistrictPosition, updateDistrictPosition, deleteDistrictPosition } from "./actions"
import { districtPositionStatuses } from "@/lib/db/schema"
import { FormSubmitButton } from "@/components/form-submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

function formatStatusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

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
            <Label htmlFor="new-position-title" className="text-xs font-medium text-muted-foreground">
              Title
            </Label>
            <Input
              id="new-position-title"
              name="title"
              className="mt-1"
              placeholder="GSR Workshop Coordinator"
              maxLength={160}
              required
            />
          </div>
          <div>
            <Label htmlFor="new-position-status" className="text-xs font-medium text-muted-foreground">
              Status
            </Label>
            <Select name="status" defaultValue="open">
              <SelectTrigger id="new-position-status" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {districtPositionStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {formatStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-position-sort-order" className="text-xs font-medium text-muted-foreground">
              Sort order
            </Label>
            <Input
              id="new-position-sort-order"
              name="sortOrder"
              type="number"
              step={1}
              min={-9999}
              max={9999}
              defaultValue="0"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-position-contact-name" className="text-xs font-medium text-muted-foreground">
              Contact name
            </Label>
            <Input id="new-position-contact-name" name="contactName" className="mt-1" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="new-position-contact-email" className="text-xs font-medium text-muted-foreground">
              Contact email
            </Label>
            <Input id="new-position-contact-email" name="contactEmail" type="email" className="mt-1" maxLength={254} />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="new-position-notes" className="text-xs font-medium text-muted-foreground">
              Notes
            </Label>
            <Textarea id="new-position-notes" name="notes" className="mt-1 min-h-24" maxLength={4000} />
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton pendingText="Creating...">Create</FormSubmitButton>
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
                    <Label htmlFor={`position-title-${p.id}`} className="text-xs font-medium text-muted-foreground">
                      Title
                    </Label>
                    <Input id={`position-title-${p.id}`} name="title" defaultValue={p.title} className="mt-1" maxLength={160} required />
                  </div>
                  <div>
                    <Label htmlFor={`position-status-${p.id}`} className="text-xs font-medium text-muted-foreground">
                      Status
                    </Label>
                    <Select name="status" defaultValue={p.status}>
                      <SelectTrigger id={`position-status-${p.id}`} className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {districtPositionStatuses.map((s) => (
                          <SelectItem key={s} value={s}>
                            {formatStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`position-sort-order-${p.id}`} className="text-xs font-medium text-muted-foreground">
                      Sort order
                    </Label>
                    <Input
                      id={`position-sort-order-${p.id}`}
                      name="sortOrder"
                      type="number"
                      step={1}
                      min={-9999}
                      max={9999}
                      defaultValue={String(p.sortOrder)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`position-contact-name-${p.id}`} className="text-xs font-medium text-muted-foreground">
                      Contact name
                    </Label>
                    <Input
                      id={`position-contact-name-${p.id}`}
                      name="contactName"
                      defaultValue={p.contactName ?? ""}
                      className="mt-1"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`position-contact-email-${p.id}`} className="text-xs font-medium text-muted-foreground">
                      Contact email
                    </Label>
                    <Input
                      id={`position-contact-email-${p.id}`}
                      name="contactEmail"
                      type="email"
                      defaultValue={p.contactEmail ?? ""}
                      className="mt-1"
                      maxLength={254}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`position-notes-${p.id}`} className="text-xs font-medium text-muted-foreground">
                      Notes
                    </Label>
                    <Textarea
                      id={`position-notes-${p.id}`}
                      name="notes"
                      defaultValue={p.notes ?? ""}
                      className="mt-1 min-h-24"
                      maxLength={4000}
                    />
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <FormSubmitButton pendingText="Saving...">Save</FormSubmitButton>
                  </div>
                </form>

                <form action={deleteDistrictPosition} className="mt-3">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={p.id} />
                  <FormSubmitButton type="submit" variant="outline" pendingText="Deleting...">
                    Delete position
                  </FormSubmitButton>
                </form>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

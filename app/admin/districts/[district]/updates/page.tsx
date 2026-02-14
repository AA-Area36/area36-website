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
import { FormSubmitButton } from "@/components/form-submit-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
        <p className="mt-1 text-sm text-muted-foreground">Draft and publish agenda note links (Google Docs/Word files) for the district site.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">New update</h2>
        <form action={createDistrictUpdate} className="mt-4 grid gap-3">
          <input type="hidden" name="districtNumber" value={districtNumber} />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label htmlFor="new-update-committee" className="text-xs font-medium text-muted-foreground">
                Committee (optional)
              </Label>
              <Input id="new-update-committee" name="committee" className="mt-1" placeholder="PI Committee" maxLength={120} />
            </div>
            <div>
              <Label htmlFor="new-update-title" className="text-xs font-medium text-muted-foreground">
                Title
              </Label>
              <Input id="new-update-title" name="title" className="mt-1" maxLength={200} required />
            </div>
          </div>
          <div>
            <Label htmlFor="new-update-body" className="text-xs font-medium text-muted-foreground">
              Document URL
            </Label>
            <Textarea
              id="new-update-body"
              name="body"
              className="mt-1 min-h-20"
              maxLength={10000}
              placeholder="https://docs.google.com/... or https://.../agenda.docx"
              required
            />
          </div>
          <div>
            <FormSubmitButton pendingText="Creating...">
              Create draft
            </FormSubmitButton>
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
                      <Label htmlFor={`update-committee-${u.id}`} className="text-xs font-medium text-muted-foreground">
                        Committee
                      </Label>
                      <Input
                        id={`update-committee-${u.id}`}
                        name="committee"
                        defaultValue={u.committee ?? ""}
                        className="mt-1"
                        maxLength={120}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`update-title-${u.id}`} className="text-xs font-medium text-muted-foreground">
                        Title
                      </Label>
                      <Input id={`update-title-${u.id}`} name="title" defaultValue={u.title} className="mt-1" maxLength={200} required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor={`update-body-${u.id}`} className="text-xs font-medium text-muted-foreground">
                      Document URL
                    </Label>
                    <Textarea
                      id={`update-body-${u.id}`}
                      name="body"
                      defaultValue={u.body}
                      className="mt-1 min-h-20"
                      maxLength={10000}
                      placeholder="https://docs.google.com/... or https://.../agenda.docx"
                      required
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <FormSubmitButton pendingText="Saving...">
                      Save
                    </FormSubmitButton>
                  </div>
                </form>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {u.publishedAt ? (
                    <form action={unpublishDistrictUpdate}>
                      <input type="hidden" name="districtNumber" value={districtNumber} />
                      <input type="hidden" name="id" value={u.id} />
                      <FormSubmitButton type="submit" variant="outline" pendingText="Unpublishing...">
                        Unpublish
                      </FormSubmitButton>
                    </form>
                  ) : (
                    <form action={publishDistrictUpdate}>
                      <input type="hidden" name="districtNumber" value={districtNumber} />
                      <input type="hidden" name="id" value={u.id} />
                      <FormSubmitButton type="submit" variant="outline" pendingText="Publishing...">
                        Publish
                      </FormSubmitButton>
                    </form>
                  )}
                  <form action={deleteDistrictUpdate}>
                    <input type="hidden" name="districtNumber" value={districtNumber} />
                    <input type="hidden" name="id" value={u.id} />
                    <FormSubmitButton type="submit" variant="outline" pendingText="Deleting...">
                      Delete
                    </FormSubmitButton>
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

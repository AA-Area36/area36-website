import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { createDistrictContact, updateDistrictContact, deleteDistrictContact } from "./actions"
import { districtContactCategories } from "@/lib/db/schema"
import { FormSubmitButton } from "@/components/form-submit-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Metadata } from "next"

export const metadata: Metadata = { title: "Contacts" }

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

function formatCategoryLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export default async function DistrictContactsAdminPage({
  params,
}: {
  params: Promise<{ district: string }>
}) {
  const p = await params
  const districtNumber = coerceDistrict(p.district)
  if (!districtNumber) notFound()

  const db = await getDb()
  const contacts = await db
    .select()
    .from(schema.districtContacts)
    .where(eq(schema.districtContacts.districtNumber, districtNumber))
    .orderBy(asc(schema.districtContacts.sortOrder), asc(schema.districtContacts.role))
    .all()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage DCM, officers, chairs, and other district contacts.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold">Add contact</h2>
        <form action={createDistrictContact} className="mt-4 grid gap-3 md:grid-cols-2">
          <input type="hidden" name="districtNumber" value={districtNumber} />
          <div>
            <Label htmlFor="new-contact-category" className="text-xs font-medium text-muted-foreground">
              Category
            </Label>
            <Select name="category" defaultValue="other">
              <SelectTrigger id="new-contact-category" className="mt-1 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {districtContactCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {formatCategoryLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="new-contact-sort-order" className="text-xs font-medium text-muted-foreground">
              Sort order
            </Label>
            <Input id="new-contact-sort-order" name="sortOrder" type="number" step={1} min={-9999} max={9999} defaultValue="0" className="mt-1" />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="new-contact-role" className="text-xs font-medium text-muted-foreground">
              Role
            </Label>
            <Input id="new-contact-role" name="role" className="mt-1" placeholder="DCM" maxLength={120} required />
          </div>
          <div>
            <Label htmlFor="new-contact-name" className="text-xs font-medium text-muted-foreground">
              Name
            </Label>
            <Input id="new-contact-name" name="name" className="mt-1" maxLength={120} />
          </div>
          <div>
            <Label htmlFor="new-contact-email" className="text-xs font-medium text-muted-foreground">
              Email
            </Label>
            <Input id="new-contact-email" name="email" type="email" className="mt-1" maxLength={254} />
          </div>
          <div>
            <Label htmlFor="new-contact-phone" className="text-xs font-medium text-muted-foreground">
              Phone
            </Label>
            <Input id="new-contact-phone" name="phone" type="tel" className="mt-1" maxLength={40} />
          </div>
          <div className="flex items-center gap-2 pt-6 text-sm">
            <Checkbox id="new-contact-active" name="active" defaultChecked />
            <Label htmlFor="new-contact-active" className="cursor-pointer font-normal">
              Active
            </Label>
          </div>
          <div className="md:col-span-2">
            <FormSubmitButton pendingText="Creating...">Create</FormSubmitButton>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Contacts</h2>
        </div>
        {contacts.length === 0 ? (
          <div className="px-6 py-10 text-sm text-muted-foreground">No contacts yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {contacts.map((c) => (
              <details key={c.id} className="px-6 py-4">
                <summary className="cursor-pointer select-none">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="font-medium">{c.role}{c.name ? `: ${c.name}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.category} • {c.active ? "active" : "inactive"} • sort {c.sortOrder}
                    </div>
                  </div>
                  {c.email && <div className="mt-1 text-xs text-muted-foreground">{c.email}</div>}
                </summary>

                <form action={updateDistrictContact} className="mt-4 grid gap-3 md:grid-cols-2">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={c.id} />
                  <div>
                    <Label htmlFor={`contact-category-${c.id}`} className="text-xs font-medium text-muted-foreground">
                      Category
                    </Label>
                    <Select name="category" defaultValue={c.category}>
                      <SelectTrigger id={`contact-category-${c.id}`} className="mt-1 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {districtContactCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {formatCategoryLabel(cat)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`contact-sort-order-${c.id}`} className="text-xs font-medium text-muted-foreground">
                      Sort order
                    </Label>
                    <Input
                      id={`contact-sort-order-${c.id}`}
                      name="sortOrder"
                      type="number"
                      step={1}
                      min={-9999}
                      max={9999}
                      defaultValue={String(c.sortOrder)}
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor={`contact-role-${c.id}`} className="text-xs font-medium text-muted-foreground">
                      Role
                    </Label>
                    <Input id={`contact-role-${c.id}`} name="role" defaultValue={c.role} className="mt-1" maxLength={120} required />
                  </div>
                  <div>
                    <Label htmlFor={`contact-name-${c.id}`} className="text-xs font-medium text-muted-foreground">
                      Name
                    </Label>
                    <Input id={`contact-name-${c.id}`} name="name" defaultValue={c.name ?? ""} className="mt-1" maxLength={120} />
                  </div>
                  <div>
                    <Label htmlFor={`contact-email-${c.id}`} className="text-xs font-medium text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      id={`contact-email-${c.id}`}
                      name="email"
                      type="email"
                      defaultValue={c.email ?? ""}
                      className="mt-1"
                      maxLength={254}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`contact-phone-${c.id}`} className="text-xs font-medium text-muted-foreground">
                      Phone
                    </Label>
                    <Input id={`contact-phone-${c.id}`} name="phone" type="tel" defaultValue={c.phone ?? ""} className="mt-1" maxLength={40} />
                  </div>
                  <div className="flex items-center gap-2 pt-6 text-sm">
                    <Checkbox id={`contact-active-${c.id}`} name="active" defaultChecked={c.active} />
                    <Label htmlFor={`contact-active-${c.id}`} className="cursor-pointer font-normal">
                      Active
                    </Label>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <FormSubmitButton pendingText="Saving...">Save</FormSubmitButton>
                  </div>
                </form>
                <form action={deleteDistrictContact} className="mt-3">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={c.id} />
                  <FormSubmitButton type="submit" variant="outline" pendingText="Deleting...">
                    Delete contact
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

import { notFound } from "next/navigation"
import { getDb, schema } from "@/lib/db"
import { asc, eq } from "drizzle-orm"
import { createDistrictContact, updateDistrictContact, deleteDistrictContact } from "./actions"
import { districtContactCategories } from "@/lib/db/schema"

function coerceDistrict(param: string): number | null {
  const n = Number(param)
  if (!Number.isFinite(n) || n < 1 || n > 27 || n === 10) return null
  return n
}

export const dynamic = "force-dynamic"

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
            <label className="block text-xs font-medium text-muted-foreground">Category</label>
            <select name="category" defaultValue="other" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
              {districtContactCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Sort order</label>
            <input name="sortOrder" defaultValue="0" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground">Role</label>
            <input name="role" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" placeholder="DCM" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Name</label>
            <input name="name" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Email</label>
            <input name="email" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Phone</label>
            <input name="phone" className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4" /> Active
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
              Create
            </button>
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
                    <label className="block text-xs font-medium text-muted-foreground">Category</label>
                    <select name="category" defaultValue={c.category} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm">
                      {districtContactCategories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Sort order</label>
                    <input name="sortOrder" defaultValue={String(c.sortOrder)} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-muted-foreground">Role</label>
                    <input name="role" defaultValue={c.role} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Name</label>
                    <input name="name" defaultValue={c.name ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Email</label>
                    <input name="email" defaultValue={c.email ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground">Phone</label>
                    <input name="phone" defaultValue={c.phone ?? ""} className="mt-1 h-9 w-full rounded-md border border-border bg-background px-3 text-sm" />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="active" defaultChecked={c.active} className="h-4 w-4" /> Active
                  </label>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                      Save
                    </button>
                  </div>
                </form>
                <form action={deleteDistrictContact} className="mt-3">
                  <input type="hidden" name="districtNumber" value={districtNumber} />
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" className="h-9 rounded-md border border-border bg-background px-4 text-sm">
                    Delete contact
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

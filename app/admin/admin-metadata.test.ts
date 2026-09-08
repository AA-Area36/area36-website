import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const titledAdminRoutes = [
  "app/admin/page.tsx",
  "app/admin/(dashboard)/content/page.tsx",
  "app/admin/(dashboard)/district-sites/page.tsx",
  "app/admin/(dashboard)/events/page.tsx",
  "app/admin/(dashboard)/files/page.tsx",
  "app/admin/(dashboard)/recordings/page.tsx",
  "app/admin/(dashboard)/reports/page.tsx",
  "app/admin/(dashboard)/roles/page.tsx",
  "app/admin/(dashboard)/subscription-drives/page.tsx",
  "app/admin/(dashboard)/subscription-drives/manage/page.tsx",
  "app/admin/districts/[district]/calendar/page.tsx",
  "app/admin/districts/[district]/contacts/page.tsx",
  "app/admin/districts/[district]/positions/page.tsx",
  "app/admin/districts/[district]/updates/page.tsx",
]

describe("admin page metadata", () => {
  it.each(titledAdminRoutes)("defines a route-specific title in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8")
    expect(source).toMatch(/export const metadata: Metadata = \{\s*title:/)
  })

  it("defines title templates for each authenticated admin shell", () => {
    for (const file of [
      "app/admin/(dashboard)/layout.tsx",
      "app/admin/corrections/layout.tsx",
      "app/admin/districts/[district]/layout.tsx",
    ]) {
      const source = readFileSync(resolve(process.cwd(), file), "utf8")
      expect(source).toContain("template:")
    }
  })
})

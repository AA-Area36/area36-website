import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const documentCardFiles = [
  "components/committees/committee-files.tsx",
  "app/(public)/newsletter/newsletter-viewer.tsx",
  "app/(public)/resources/resource-viewer.tsx",
]

describe("document card semantics", () => {
  it.each(documentCardFiles)(
    "uses non-interactive cards with explicit controls in %s",
    (file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8")

      expect(source).toContain("<article")
      expect(source).not.toContain('role="button"')
      expect(source).not.toMatch(/<article[^>]*\bonClick=/)
      expect(source).toMatch(/aria-label={`(?:View|Download) /)
    },
  )
})

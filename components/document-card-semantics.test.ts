import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const documentCardFiles = [
  "components/committees/committee-files.tsx",
  "app/(public)/newsletter/newsletter-viewer.tsx",
  "app/(public)/resources/resource-viewer.tsx",
  "app/(public)/events/annual-calendar-section.tsx",
  "app/(public)/general-service-conference/background-materials-content.tsx",
  "app/(public)/general-service-conference/conference-materials-content.tsx",
  "app/(public)/general-service-conference/final-reports-content.tsx",
  "app/(public)/service/service-resources.tsx",
]

const eventCardsFile = "app/(public)/events/events-client.tsx"

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

  it("keeps event cards non-interactive while retaining explicit links", () => {
    const source = readFileSync(resolve(process.cwd(), eventCardsFile), "utf8")

    expect(source).not.toContain('role: "link"')
    expect(source).not.toContain("getEventCardLinkProps")
    expect(source).toContain("buildMapsHref(event.address)")
    expect(source).toContain("href={event.meetingLink}")
  })
})

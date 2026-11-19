import { describe, expect, it } from "vitest"
import { CONTENT_SCHEMAS } from "@/lib/content/schema"
import type { Resource } from "@/lib/gdrive/types"
import { buildDocumentEntries } from "./documents"
import { createSearchIndex, SEARCH_GROUPS, searchSnippet } from "./index"
import { buildPageEntries, SEARCH_PAGES } from "./pages"

const pages = buildPageEntries(Object.fromEntries(SEARCH_PAGES.map(({ scope }) => [scope, CONTENT_SCHEMAS[scope].defaultsEn])))
const search = createSearchIndex(pages)
const pdf = {
  id: "shared-file",
  driveId: "shared-file",
  title: "District 7 meeting location",
  mimeType: "application/pdf",
  category: "area-documents",
  previewUrl: "/api/files/preview/shared-file",
  downloadUrl: "/api/files/download/shared-file",
} satisfies Resource

describe("sitewide search", () => {
  it("orders document, page and general information groups separately", () => {
    const documents = buildDocumentEntries({ conference: [pdf] })
    const results = createSearchIndex([...pages, ...documents])("district 7 location")
    expect(SEARCH_GROUPS.map(({ id }) => id)).toEqual(["documents", "pages", "information"])
    expect(results.documents[0].title).toBe(pdf.title)
    expect(results.pages[0].href).toBe("/districts?district=7#district-7")
  })

  it("handles district questions, typos, and numeric district identity", () => {
    for (const query of ["district 7 location", "where does distict #07 meet?", "district 7"]) {
      const [result] = search(query).pages
      expect(result.href).toBe("/districts?district=7#district-7")
      expect(searchSnippet(result, query)).toContain("Eden Prairie")
      expect(search(query).pages.filter((entry) => entry.districtNumber).map((entry) => entry.districtNumber)).toEqual([7])
    }
    expect(search("district 17").pages[0].href).toBe("/districts?district=17#district-17")
    expect(search("district 70").pages.filter((entry) => entry.districtNumber)).toEqual([])
    expect(search("Owatonna").pages[0].href).toBe("/districts?district=3#district-3")
  })

  it("prioritizes committee and topic links and separates matches in page copy", () => {
    expect(search("ttcc@area36.org").pages.some((entry) => entry.href === "/committees?committee=treatment#committee-treatment")).toBe(true)
    expect(search("corrections").pages[0].title).toBe("Corrections")
    expect(search("GSR").pages.some((entry) => entry.href === "/service-basics#positions-heading")).toBe(true)
    expect(search("clergy").information.some((entry) => entry.href === "/professionals")).toBe(true)
  })

  it("searches localized published content and tolerates accents and spelling errors", () => {
    const entries = buildPageEntries({ committees: { committeesData: {
      treatment: { name: "Tratamiento", slug: "treatment", chairName: "Updated Chair" },
    } } })
    const localizedSearch = createSearchIndex(entries)
    expect(localizedSearch("updated chair").pages[0].title).toBe("Tratamiento")
    expect(search("VINA").pages.some((entry) => entry.href === "/grapevine")).toBe(true)
    expect(search("newsleter").pages.some((entry) => entry.href === "/newsletter")).toBe(true)
    for (const query of ["corrections nonexistentterm", "[.*", "  "]) {
      expect(Object.values(search(query)).flat()).toEqual([])
    }
  })

  it("deduplicates the Drive ID and preserves protection across catalogs", () => {
    const entries = buildDocumentEntries({
      conference: [pdf],
      newsletters: [{
        id: "issue-slug", driveId: pdf.driveId, title: "The Pigeon", issue: "May 2026",
        year: 2026, month: 5, description: "Bridging the Gap", highlights: ["Workshop notes"],
        previewUrl: pdf.previewUrl, downloadUrl: pdf.downloadUrl,
      }],
      background: {
        agendaItems: [{ ...pdf, name: "Workshop", displayName: "Workshop agenda", isProtected: true }],
        backgroundMaterials: [], advisoryActions: [], miscFiles: [],
      },
      calendars: [{ ...pdf, name: "Annual Calendar", displayName: "2026 Calendar", isProtected: false }],
    })
    expect(entries).toHaveLength(1)
    expect(entries[0].resource).toMatchObject({ id: pdf.driveId, isProtected: true, downloadUrl: pdf.downloadUrl })
    const searchDocuments = createSearchIndex(entries)
    for (const query of ["district 7", "workshop notes", "conference agenda", "annual calendar"]) {
      expect(searchDocuments(query).documents).toHaveLength(1)
    }
  })
})

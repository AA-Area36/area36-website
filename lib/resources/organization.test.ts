import { describe, expect, it } from "vitest"
import type { Resource } from "@/lib/gdrive/types"
import { getDocumentCategories, getDocumentCategory, getResourceDocumentDate, groupResourcesByCategory, sortResources } from "./organization"

function resource(title: string, overrides: Partial<Resource> = {}): Resource {
  return {
    id: title,
    title,
    category: "area-documents",
    mimeType: "application/pdf",
    previewUrl: `/preview/${title}`,
    driveId: title,
    ...overrides,
  }
}

describe("document categories", () => {
  it.each([
    ["smaa_by_laws_2020_12_12", "bylaws"],
    ["Area 36 By-Laws", "bylaws"],
    ["Area 36 Finance Policy FINAL APPROVED 06-2026.docx", "policies"],
    ["area36_inclement_weather_procedure", "policies"],
    ["2027 Budget Ver 2", "budgets"],
    ["Finance Budget 2026", "budgets"],
    ["QFR-3rd-Q-2025-FINAL-EN-protected", "financial"],
    ["Treasurer Report", "financial"],
    ["2024_Area-36-Revised-Trusted-Servant-Guidelines", "guidelines"],
    ["2026-conference-manuals", "guidelines"],
    ["2026_Area36_Calendar_Rev 2", "calendars"],
    ["4-21-26-assembly-registration", "other"],
  ])("categorizes %s as %s", (title, expected) => {
    expect(getDocumentCategory(resource(title)).id).toBe(expected)
  })

  it("prefers the category assigned in the metadata editor", () => {
    expect(getDocumentCategory(resource("Finance Budget", { documentCategory: "Policies & Procedures" })).id)
      .toBe("policies")
    expect(getDocumentCategory(resource("Finance Budget", { documentCategory: "Other Documents" })).id)
      .toBe("other")
  })

  it("honors a custom category set by an admin instead of guessing from the title", () => {
    expect(getDocumentCategory(resource("2026 Budget", { documentCategory: "General Materials" })).id)
      .toBe("custom:general materials")
  })

  it("adds saved custom categories to the public choices and merges case variants", () => {
    const categories = getDocumentCategories([
      resource("One", { documentCategory: " Safety Resources " }),
      resource("Two", { documentCategory: "safety resources" }),
    ])
    expect(categories.filter(({ id }) => id.startsWith("custom:")))
      .toEqual([{ id: "custom:safety resources", label: "Safety Resources" }])
  })

  it("groups by the saved category and preserves the selected file order within a group", () => {
    const files = [
      resource("Budget 2026"),
      resource("Finance Policy 2025"),
      resource("Budget 2024"),
      resource("Safety Guide", { documentCategory: "Safety Resources" }),
    ]
    const groups = groupResourcesByCategory(files)
    expect(groups.map(({ category }) => category.label)).toEqual([
      "Budgets", "Policies & Procedures", "Safety Resources",
    ])
    expect(groups[0].resources.map(({ title }) => title)).toEqual(["Budget 2026", "Budget 2024"])
  })
})

describe("document dates and sorting", () => {
  it.each([
    ["smaa_by_laws_2020_12_12", "2020"],
    ["2024_area36_budget_approved_23_10_21", "2024"],
    ["Report_March_2025", "March 2025"],
    ["Area Handbook", "2026"],
  ])("extracts the document date from %s before the upload year", (title, expected) => {
    expect(getResourceDocumentDate(resource(title, { date: "2026" }))).toBe(expected)
  })

  it("sorts actual document years and leaves the source array unchanged", () => {
    const files = [resource("smaa_by_laws_2020_12_12", { date: "2026" }), resource("Budget 2027"), resource("Budget 2024")]
    expect(sortResources(files, "newest").map(({ title }) => title))
      .toEqual(["Budget 2027", "Budget 2024", "smaa_by_laws_2020_12_12"])
    expect(sortResources(files, "oldest").map(({ title }) => title))
      .toEqual(["smaa_by_laws_2020_12_12", "Budget 2024", "Budget 2027"])
    expect(files[0].title).toBe("smaa_by_laws_2020_12_12")
  })

  it("uses month and modification time to order documents from the same year", () => {
    const files = [
      resource("Report January 2025"),
      resource("Report June 2025", { modifiedTime: "2025-07-01T00:00:00Z" }),
      resource("Revised report June 2025", { modifiedTime: "2025-08-01T00:00:00Z" }),
    ]
    expect(sortResources(files, "newest").map(({ title }) => title)).toEqual([
      "Revised report June 2025", "Report June 2025", "Report January 2025",
    ])
  })

  it("keeps missing or invalid dates at the end in either date direction", () => {
    const files = [resource("Undated", { date: "invalid" }), resource("Budget 2026"), resource("Budget 2024")]
    expect(sortResources(files, "newest").at(-1)?.title).toBe("Undated")
    expect(sortResources(files, "oldest").at(-1)?.title).toBe("Undated")
  })

  it("orders same-year files consistently when some lack modification timestamps", () => {
    const files = [
      resource("A", { date: "2025", modifiedTime: "2025-03-01T00:00:00Z" }),
      resource("B", { date: "2025" }),
      resource("C", { date: "2025", modifiedTime: "2025-06-01T00:00:00Z" }),
    ]
    expect(sortResources(files, "newest").map(({ title }) => title)).toEqual(["C", "A", "B"])
    expect(sortResources(files, "oldest").map(({ title }) => title)).toEqual(["A", "C", "B"])
  })

  it("sorts titles naturally in either direction", () => {
    const files = [resource("Report 10"), resource("report 2"), resource("Budget")]
    expect(sortResources(files, "title-asc").map(({ title }) => title)).toEqual(["Budget", "report 2", "Report 10"])
    expect(sortResources(files, "title-desc").map(({ title }) => title)).toEqual(["Report 10", "report 2", "Budget"])
  })
})

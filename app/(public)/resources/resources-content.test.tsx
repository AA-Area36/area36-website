import { fireEvent, render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { ComponentProps } from "react"
import type { PDFViewer } from "@/components/pdf-viewer"
import type { Resource, ResourcesByCategory } from "@/lib/gdrive/types"
import { ResourcesContent } from "./resources-content"

vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock("@/lib/actions/verify-password", () => ({ verifyFilePassword: vi.fn() }))
vi.mock("@/components/pdf-viewer", () => ({
  PDFViewer: ({ title, currentIndex, totalCount, canGoNext, onNext }: ComponentProps<typeof PDFViewer>) => (
    <div role="dialog" aria-label={title}>
      <p>{(currentIndex ?? 0) + 1} of {totalCount}</p>
      <button disabled={!canGoNext} onClick={onNext}>Next</button>
    </div>
  ),
}))

function resource(title: string, overrides: Partial<Resource> = {}): Resource {
  return {
    id: title,
    driveId: title,
    title,
    category: "area-documents",
    mimeType: "application/pdf",
    previewUrl: `/api/files/preview/${title}`,
    ...overrides,
  }
}

const resources: ResourcesByCategory = {
  areaDocuments: [
    resource("Budget 2024"),
    resource("Budget 2026"),
    resource("Finance Policy 2025"),
    resource("Guidelines 2022", { mimeType: "application/zip" }),
  ],
  forms: [resource("Group Form", { category: "forms" }), resource("Expense Form", { category: "forms" })],
  delegateReports: [resource("Delegate Report 2026", { category: "delegate-reports" })],
  conferenceMaterials: [],
}

async function choose(label: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: label }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: option }))
}

function titles(section: string) {
  return within(screen.getByRole("region", { name: section }))
    .getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)
}

describe("resource filtering and sorting", () => {
  it("provides category filtering and grouping controls for every section", () => {
    render(<ResourcesContent resources={resources} />)
    for (const title of ["Area Documents", "Forms", "Delegate Reports"]) {
      const section = within(screen.getByRole("region", { name: title }))
      expect(section.getByRole("combobox", { name: `Filter ${title.toLowerCase()} by category` })).toBeVisible()
      expect(section.getByRole("switch", { name: "Group by category" })).not.toBeChecked()
    }
  })

  it("filters documents without hiding forms or reports and previews the filtered sort order", async () => {
    render(<ResourcesContent resources={resources} />)
    await choose("Filter area documents by category", "Budgets (2)")
    expect(titles("Area Documents")).toEqual(["Budget 2026", "Budget 2024"])
    expect(screen.getByRole("heading", { name: "Expense Form" })).toBeVisible()
    expect(screen.getByRole("heading", { name: "Delegate Report 2026" })).toBeVisible()

    await choose("Sort area documents", "Oldest first")
    expect(titles("Area Documents")).toEqual(["Budget 2024", "Budget 2026"])
    fireEvent.click(screen.getByRole("button", { name: "View Budget 2024" }))
    expect(await screen.findByRole("dialog", { name: "Budget 2024" })).toHaveTextContent("1 of 2")
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("dialog", { name: "Budget 2026" })).toHaveTextContent("2 of 2")
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled()
  })

  it("sorts each section independently and skips non-PDF files in preview navigation", async () => {
    render(<ResourcesContent resources={resources} />)
    await choose("Sort forms", "Title: Z–A")
    expect(titles("Forms")).toEqual(["Group Form", "Expense Form"])
    expect(titles("Area Documents")).toEqual(["Budget 2026", "Finance Policy 2025", "Budget 2024", "Guidelines 2022"])

    await choose("Sort area documents", "Oldest first")
    fireEvent.click(screen.getByRole("button", { name: "View Budget 2024" }))
    expect(await screen.findByRole("dialog", { name: "Budget 2024" })).toHaveTextContent("1 of 3")
  })

  it("lets visitors recover from an empty category", async () => {
    render(<ResourcesContent resources={resources} />)
    await choose("Filter area documents by category", "Bylaws (0)")
    expect(screen.getByText("No documents in this category.")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Show all documents" }))
    expect(titles("Area Documents")).toHaveLength(4)
  })

  it("toggles category groups while preserving the sort and preview order", async () => {
    render(<ResourcesContent resources={resources} />)
    fireEvent.click(within(screen.getByRole("region", { name: "Area Documents" })).getByRole("switch", { name: "Group by category" }))
    const budgets = screen.getByRole("region", { name: "Budgets" })
    expect(within(budgets).getAllByRole("heading", { level: 4 }).map((el) => el.textContent))
      .toEqual(["Budget 2026", "Budget 2024"])
    expect(screen.getByRole("region", { name: "Policies & Procedures" })).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "View Budget 2026" }))
    expect(await screen.findByRole("dialog", { name: "Budget 2026" })).toHaveTextContent("1 of 3")
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("dialog", { name: "Budget 2024" })).toHaveTextContent("2 of 3")
  })

  it("offers custom admin categories and includes new files in their saved group", async () => {
    render(<ResourcesContent resources={{
      ...resources,
      areaDocuments: [...resources.areaDocuments, resource("New file", { documentCategory: "Safety Resources" })],
    }} />)
    await choose("Filter area documents by category", "Safety Resources (1)")
    expect(titles("Area Documents")).toEqual(["New file"])
    fireEvent.click(within(screen.getByRole("region", { name: "Area Documents" })).getByRole("switch", { name: "Group by category" }))
    expect(screen.getByRole("region", { name: "Safety Resources" })).toBeVisible()
    fireEvent.click(within(screen.getByRole("region", { name: "Area Documents" })).getByRole("switch", { name: "Group by category" }))
    expect(screen.queryByRole("region", { name: "Safety Resources" })).not.toBeInTheDocument()
    expect(titles("Area Documents")).toEqual(["New file"])
  })

  it.each([
    { key: "forms", title: "Forms", category: "forms" },
    { key: "delegateReports", title: "Delegate Reports", category: "delegate-reports" },
  ] as const)("filters, groups, sorts, and previews $title independently", async ({ key, title, category }) => {
    const files = [
      resource("Saved topic A", { category, documentCategory: "Saved topic" }),
      resource("Saved topic B", { category, documentCategory: "Saved topic" }),
      resource("Other file", { category, documentCategory: "Other Documents" }),
    ]
    render(<ResourcesContent resources={{ ...resources, [key]: files }} />)
    await choose(`Filter ${title.toLowerCase()} by category`, "Saved topic (2)")
    await choose(`Sort ${title.toLowerCase()}`, "Title: Z–A")
    const section = within(screen.getByRole("region", { name: title }))
    expect(section.getByRole("status")).toHaveTextContent("2 of 3 files")
    expect(titles(title)).toEqual(["Saved topic B", "Saved topic A"])
    expect(titles("Area Documents")).toHaveLength(4)

    fireEvent.click(section.getByRole("switch", { name: "Group by category" }))
    expect(section.getByRole("region", { name: "Saved topic" })).toBeVisible()
    expect(section.getAllByRole("heading", { level: 4 }).map((el) => el.textContent))
      .toEqual(["Saved topic B", "Saved topic A"])
    expect(within(screen.getByRole("region", { name: "Area Documents" }))
      .getByRole("switch", { name: "Group by category" })).not.toBeChecked()

    fireEvent.click(section.getByRole("button", { name: "View Saved topic B" }))
    expect(await screen.findByRole("dialog", { name: "Saved topic B" })).toHaveTextContent("1 of 2")
    fireEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByRole("dialog", { name: "Saved topic A" })).toHaveTextContent("2 of 2")
  })

  it("uses distinct heading IDs when sections share the same category", () => {
    const common = { documentCategory: "Financial Reports" }
    const { container } = render(<ResourcesContent resources={{
      ...resources,
      areaDocuments: [resource("Area finances", common)],
      forms: [resource("Expense form", { ...common, category: "forms" })],
      delegateReports: [resource("Delegate finances", { ...common, category: "delegate-reports" })],
    }} />)
    for (const switchControl of screen.getAllByRole("switch", { name: "Group by category" })) {
      fireEvent.click(switchControl)
    }
    const groups = [...container.querySelectorAll('section section[aria-labelledby]')]
      .filter((el) => el.getAttribute("aria-labelledby")?.includes("-group-"))
    expect(groups).toHaveLength(3)
    expect(new Set(groups.map((el) => el.getAttribute("aria-labelledby"))).size).toBe(3)
  })
})

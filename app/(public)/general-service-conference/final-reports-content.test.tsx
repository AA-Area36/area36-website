import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { ServiceResource } from "@/lib/gdrive/service-resources"
import { FinalReportsContent } from "./final-reports-content"

const orderingGuide: ServiceResource = {
  id: "ordering-guide",
  fileName: "EN - Final Report Process Communication.pdf",
  name: "Final Report ordering instructions",
  previewUrl: "/api/files/preview/ordering-guide",
  downloadUrl: "/api/files/download/ordering-guide",
  mimeType: "application/pdf",
}

const archivedReport = {
  id: "report-2022",
  title: "2022 Final Report English",
  category: "conference-materials" as const,
  mimeType: "application/pdf",
  previewUrl: "/api/files/preview/report-2022",
  downloadUrl: "/api/files/download/report-2022",
  driveId: "drive-report-2022",
}

describe("FinalReportsContent", () => {
  it("shows a subtle link to the Final Report ordering guide when available", () => {
    render(<FinalReportsContent oldReports={[]} orderingGuide={orderingGuide} />)

    const section = screen.getByRole("complementary", {
      name: "Ordering printed Final Reports",
    })
    const link = screen.getByRole("link", { name: "View ordering instructions" })

    expect(section).toHaveClass("bg-muted/20")
    expect(link).toHaveAttribute("href", orderingGuide.previewUrl)
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("omits the ordering section when the Drive resource is unavailable", () => {
    render(<FinalReportsContent oldReports={[]} />)

    expect(screen.queryByRole("complementary", {
      name: "Ordering printed Final Reports",
    })).not.toBeInTheDocument()
  })

  it("allows report cards to shrink within narrow grid columns", () => {
    render(<FinalReportsContent oldReports={[archivedReport]} />)

    expect(screen.getByText("2022 Final Report (English)").closest("article"))
      .toHaveClass("min-w-0")

    expect(screen.getByRole("link", { name: /2026 Rapport Final/ }))
      .toHaveClass("min-w-0")
  })
})

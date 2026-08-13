import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ServiceResource } from "@/lib/gdrive/service-resources"

const { useServiceResources } = vi.hoisted(() => ({
  useServiceResources: vi.fn(),
}))

vi.mock("@/lib/hooks/use-gdrive-files", () => ({
  useServiceResources,
}))

import {
  FinalReportOrderBanner,
  findFinalReportProcessResource,
} from "./final-report-order-banner"

const orderingGuide: ServiceResource = {
  id: "ordering-guide",
  fileName: "EN - Final Report Process Communication.pdf",
  name: "Final Report ordering instructions",
  previewUrl: "/api/files/preview/ordering-guide",
  downloadUrl: "/api/files/download/ordering-guide",
  mimeType: "application/pdf",
}

describe("FinalReportOrderBanner", () => {
  beforeEach(() => {
    localStorage.clear()
    useServiceResources.mockReturnValue({ data: [orderingGuide] })
  })

  it("finds the guide by its original Drive filename when its display name differs", () => {
    expect(findFinalReportProcessResource([
      { ...orderingGuide, id: "other", fileName: "Service Manual.pdf" },
      orderingGuide,
    ])).toBe(orderingGuide)
  })

  it("links the site-wide announcement to the PDF preview", async () => {
    render(<FinalReportOrderBanner />)

    const links = await screen.findAllByRole("link", { name: /view (ordering )?guide/i })
    for (const link of links) {
      expect(link).toHaveAttribute("href", orderingGuide.previewUrl)
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    }
    expect(screen.getByRole("link", { name: "View ordering guide" })).toHaveAttribute(
      "data-variant",
      "secondary",
    )
    expect(screen.queryByText("New guide")).not.toBeInTheDocument()
  })

  it("remembers when the new announcement is dismissed", async () => {
    render(<FinalReportOrderBanner />)

    fireEvent.click(await screen.findByRole("button", {
      name: "Dismiss Final Report ordering announcement",
    }))

    await waitFor(() => {
      expect(screen.queryByLabelText("Final Report ordering announcement")).not.toBeInTheDocument()
    })
    expect(localStorage.getItem("a36_final_report_ordering_banner_dismissed")).toBe("true")
  })
})

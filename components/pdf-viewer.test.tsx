import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { PDFViewer } from "./pdf-viewer"

describe("PDFViewer", () => {
  it("exposes a labelled modal dialog", async () => {
    render(
      <PDFViewer
        previewUrl="about:blank"
        title="Service manual"
        subtitle="PDF document"
        onClose={vi.fn()}
      />
    )

    const dialog = await screen.findByRole("dialog", { name: "Service manual" })
    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(dialog).toHaveAccessibleDescription("PDF document")
  })
})

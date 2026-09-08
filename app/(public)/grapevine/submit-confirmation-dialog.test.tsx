import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SubmitConfirmationDialog } from "./submit-confirmation-dialog"
vi.mock("react-google-recaptcha-v3", () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha: vi.fn() }) }))
vi.mock("./actions", () => ({ submitDriveConfirmation: vi.fn() }))

describe("confirmation image input", () => {
  it("offers a labeled native file input and describes invalid file errors", async () => {
    render(<SubmitConfirmationDialog />)
    fireEvent.click(screen.getByRole("button", { name: "Submit Confirmation" }))
    const input = await screen.findByLabelText("Confirmation Image *")
    expect(input).toBeVisible()
    expect(input).toHaveAttribute("type", "file")
    expect(input).toBeRequired()
    expect(input).not.toHaveClass("hidden")
    fireEvent.change(input, { target: { files: [new File(["invalid"], "invalid.txt", { type: "text/plain" })] } })
    await waitFor(() => expect(input).toHaveAttribute("aria-invalid", "true"))
    expect(input).toHaveAccessibleDescription("JPG, PNG, or WebP (max 10MB) Please upload a JPG, PNG, or WebP image.")
    expect(screen.getByRole("alert")).toHaveTextContent("Please upload a JPG, PNG, or WebP image.")
  })
})

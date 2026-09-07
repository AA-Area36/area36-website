import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { QuorumCheckInClient } from "./quorum-check-in-client"

const { executeRecaptcha, submitQuorumRegistration } = vi.hoisted(() => ({
  executeRecaptcha: vi.fn(),
  submitQuorumRegistration: vi.fn(),
}))
vi.mock("react-google-recaptcha-v3", () => ({ useGoogleReCaptcha: () => ({ executeRecaptcha }) }))
vi.mock("./actions", () => ({ submitQuorumRegistration }))

const event = { eventKey: "syntheticKey01", title: "Synthetic assembly", eventDate: "2026-09-06", status: "open" as const }

async function choose(name: string, option: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name }), { key: "ArrowDown" })
  fireEvent.click(await screen.findByRole("option", { name: option }))
}

describe("quorum check-in accessibility and submission", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    executeRecaptcha.mockResolvedValue("synthetic-security-token")
    submitQuorumRegistration.mockResolvedValue({ success: true })
    Element.prototype.scrollIntoView = vi.fn()
  })

  it("associates required field errors and focuses a readable summary", async () => {
    render(<QuorumCheckInClient event={event} />)
    const name = screen.getByRole("textbox", { name: "First and last name" })
    expect(name).toBeRequired()
    expect(screen.getByRole("combobox", { name: "Newsletter delivery" })).toHaveAttribute("aria-required", "true")
    fireEvent.submit(name.closest("form")!)
    const summary = await screen.findByRole("alert")
    expect(summary).toHaveTextContent("First and last name are required")
    await waitFor(() => expect(summary).toHaveFocus())
    expect(name).toHaveAttribute("aria-invalid", "true")
    expect(name).toHaveAccessibleDescription("First and last name are required")
    expect(screen.getByRole("combobox", { name: "Newsletter delivery" })).toHaveAccessibleDescription("Choose how you would like to receive The Pigeon")
    expect(executeRecaptcha).not.toHaveBeenCalled()
    expect(submitQuorumRegistration).not.toHaveBeenCalled()
  })

  it("exposes and validates conditionally required service details", async () => {
    render(<QuorumCheckInClient event={event} />)
    await choose("Newsletter delivery", "Neither")
    await choose("Service position", "Area Officer")
    const office = screen.getByRole("textbox", { name: "Area office" })
    expect(office).toBeRequired()
    fireEvent.submit(office.closest("form")!)
    await waitFor(() => expect(office).toHaveAccessibleDescription("Enter the Area office"))
  })

  it("acquires a token before final validation and submits only once", async () => {
    let resolveToken: (token: string) => void = () => undefined
    executeRecaptcha.mockReturnValue(new Promise<string>((resolve) => { resolveToken = resolve }))
    render(<QuorumCheckInClient event={event} />)
    const values = {
      "First and last name": "Synthetic Attendee",
      "Home group": "Synthetic Group",
      "Personal email": "audit@example.invalid",
      "Phone number": "5550100123",
      "Street address": "123 Example Street",
      City: "Example",
      State: "MN",
      ZIP: "55101",
    }
    for (const [name, value] of Object.entries(values)) {
      fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } })
    }
    await choose("Newsletter delivery", "Neither")
    const form = screen.getByRole("textbox", { name: "First and last name" }).closest("form")!
    fireEvent.submit(form)
    await waitFor(() => expect(executeRecaptcha).toHaveBeenCalledTimes(1))
    fireEvent.submit(form)
    expect(submitQuorumRegistration).not.toHaveBeenCalled()
    resolveToken("synthetic-security-token")
    await screen.findByRole("heading", { name: "You’re checked in" })
    expect(submitQuorumRegistration).toHaveBeenCalledTimes(1)
    expect(submitQuorumRegistration).toHaveBeenCalledWith(event.eventKey, expect.objectContaining({ recaptchaToken: "synthetic-security-token", newsletterDelivery: "neither" }))
  })
})

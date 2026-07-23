import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-google-recaptcha-v3", () => ({
  useGoogleReCaptcha: () => ({ executeRecaptcha: vi.fn() }),
}))

vi.mock("./actions", () => ({
  submitContactForm: vi.fn(),
}))

import { ContactClient } from "./contact-client"

describe("ContactClient required fields", () => {
  it("exposes required state before the user submits the form", () => {
    render(<ContactClient />)

    expect(
      screen.getByText("Fields marked required must be completed."),
    ).toBeVisible()

    expect(
      screen.getByRole("combobox", {
        name: /Who would you like to contact/i,
      }),
    ).toHaveAttribute("aria-required", "true")

    for (const name of ["First Name", "Last Name", "Email", "Subject", "Message"]) {
      expect(
        screen.getByRole("textbox", { name: new RegExp(name, "i") }),
      ).toBeRequired()
    }

    expect(
      screen.getByRole("checkbox", {
        name: /I understand that A\.A\. is a program of anonymity/i,
      }),
    ).toHaveAttribute("aria-required", "true")
  })
})

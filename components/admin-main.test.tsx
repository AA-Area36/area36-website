import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { AdminMain } from "./admin-main"

describe("AdminMain", () => {
  it("provides the root skip link with a focusable target", () => {
    render(<AdminMain>Admin content</AdminMain>)

    const main = screen.getByRole("main")
    expect(main).toHaveAttribute("id", "main-content")
    expect(main).toHaveAttribute("tabindex", "-1")
  })
})

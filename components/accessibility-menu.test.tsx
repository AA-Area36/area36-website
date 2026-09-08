import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"
import { AccessibilityMenu } from "./accessibility-menu"

describe("AccessibilityMenu", () => {
  afterEach(() => {
    document.documentElement.style.fontSize = ""
  })

  it("presents every text-size action in the keyboard tab order", async () => {
    const user = userEvent.setup()
    render(<AccessibilityMenu />)

    await user.click(screen.getByRole("button", { name: "Accessibility options" }))

    const decrease = screen.getByRole("button", { name: "Decrease text size" })
    expect(decrease).toHaveFocus()

    await user.tab()
    expect(screen.getByRole("button", { name: "Reset text size" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("button", { name: "Increase text size" })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole("link", { name: "ASL Resources" })).toHaveFocus()
  })

  it("updates the announced text-size value", async () => {
    const user = userEvent.setup()
    render(<AccessibilityMenu />)

    await user.click(screen.getByRole("button", { name: "Accessibility options" }))
    await user.click(screen.getByRole("button", { name: "Increase text size" }))

    expect(screen.getByText("Text Size: 110%")).toBeInTheDocument()
    expect(document.documentElement.style.fontSize).toBe("110%")
  })
})

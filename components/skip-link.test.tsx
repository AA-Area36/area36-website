import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SkipLink } from "./skip-link"

describe("SkipLink", () => {
  it("moves focus to the configured main target", () => {
    const scrollIntoView = vi.fn()
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1} ref={(node) => {
          if (node) node.scrollIntoView = scrollIntoView
        }}>
          Content
        </main>
      </>,
    )

    fireEvent.click(screen.getByRole("link", { name: "Skip to main content" }))

    expect(screen.getByRole("main")).toHaveFocus()
    expect(window.location.hash).toBe("#main-content")
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" })
  })
})

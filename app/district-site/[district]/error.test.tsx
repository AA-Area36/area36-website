import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import DistrictError from "./error"

describe("DistrictError", () => {
  it("announces the outage without presenting it as empty content and retries", () => {
    const reset = vi.fn()

    render(<DistrictError error={new Error("private D1 detail")} reset={reset} />)

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent("District information is temporarily unavailable")
    expect(alert).toHaveTextContent("This does not mean the district has no")
    expect(alert).not.toHaveTextContent("private D1 detail")

    fireEvent.click(screen.getByRole("button", { name: "Try again" }))
    expect(reset).toHaveBeenCalledTimes(1)
  })
})

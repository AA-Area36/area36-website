import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EventsClient } from "./events-client"

const { replace, searchParams } = vi.hoisted(() => ({ replace: vi.fn(), searchParams: new URLSearchParams() }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), useSearchParams: () => searchParams }))
vi.mock("./annual-calendar-section", () => ({ AnnualCalendarSection: () => null }))

describe("event filter names and sections", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => url.startsWith("/api/district-meetings") ? [] : { events: [], nextCursor: null } })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it("keeps both type filters named after selection and exposes section headings", async () => {
    render(<EventsClient events={[]} calendarFiles={[]} hero={{ title: "Events Calendar", description: "Synthetic events" }} />)
    const upcoming = screen.getByRole("combobox", { name: "Filter upcoming events by type" })
    fireEvent.click(upcoming)
    fireEvent.click(await screen.findByRole("option", { name: "Assembly" }))
    expect(upcoming).toHaveAccessibleName("Filter upcoming events by type")
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" })
    fireEvent.click(screen.getByRole("button", { name: /Past Events/ }))
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Filter past events by type" })).toBeVisible())
    expect(screen.getByRole("heading", { level: 2, name: "Upcoming Events" })).toBeVisible()
    expect(screen.getByRole("heading", { level: 2, name: "Past Events" })).toBeVisible()
  })
})

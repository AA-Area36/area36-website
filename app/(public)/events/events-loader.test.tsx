import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { EventsLoader } from "./events-loader"

const { getAnnualCalendarFiles } = vi.hoisted(() => ({
  getAnnualCalendarFiles: vi.fn(),
}))

vi.mock("./calendar-file-actions", () => ({
  getAnnualCalendarFiles,
}))
vi.mock("./events-client", () => ({
  EventsClient: ({ events, calendarFiles }: { events: unknown[]; calendarFiles: unknown[] }) => (
    <div data-testid="events-client">
      Loaded {events.length} events and {calendarFiles.length} calendar files
    </div>
  ),
}))

const hero = {
  title: "Events Calendar",
  description: "Area 36 events",
}

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe("EventsLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAnnualCalendarFiles.mockResolvedValue([])
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("preserves a successful empty response as a legitimate empty calendar", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([])))

    render(<EventsLoader hero={hero} />)

    expect(await screen.findByTestId("events-client")).toHaveTextContent("Loaded 0 events")
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("renders events before optional Drive calendar metadata settles", async () => {
    let resolveCalendarFiles: (files: unknown[]) => void = () => undefined
    getAnnualCalendarFiles.mockReturnValue(
      new Promise((resolve) => {
        resolveCalendarFiles = resolve
      })
    )
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response([{ id: "event-1" }])))

    render(<EventsLoader hero={hero} />)

    expect(await screen.findByTestId("events-client")).toHaveTextContent(
      "Loaded 1 events and 0 calendar files"
    )

    resolveCalendarFiles([{ id: "calendar-1" }])
    await waitFor(() => {
      expect(screen.getByTestId("events-client")).toHaveTextContent(
        "Loaded 1 events and 1 calendar files"
      )
    })
  })

  it("shows an announced unavailable state instead of an empty calendar on API failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, false, 500)))
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(<EventsLoader hero={hero} />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Event information is temporarily unavailable")
    expect(alert).toHaveTextContent("This does not mean there are no upcoming events")
    expect(screen.queryByTestId("events-client")).not.toBeInTheDocument()
  })

  it("recovers through the visible retry action", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network unavailable"))
      .mockResolvedValueOnce(response([{ id: "event-1" }]))
    vi.stubGlobal("fetch", fetchMock)
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(<EventsLoader hero={hero} />)

    fireEvent.click(await screen.findByRole("button", { name: "Try again" }))

    await waitFor(() => {
      expect(screen.getByTestId("events-client")).toHaveTextContent("Loaded 1 events")
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("treats malformed success payloads as unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ events: [] })))
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(<EventsLoader hero={hero} />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Event information is temporarily unavailable"
    )
  })
})

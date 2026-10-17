import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createElectionState } from "@/lib/elections/model"
import { toPublicElection } from "@/lib/elections/public"
import { PublicElectionDisplay } from "./public-election-display"

function fixture() {
  const state = createElectionState("Assembly election", "2026-10-17")
  state.publicDisplay = { enabled: true, officeIndex: 0 }
  Object.assign(state.offices[0], { status: "balloting", expectedVotes: 100, eligibleIds: ["1", "2"], candidates: [{ id: "1", name: "Alex" }, { id: "2", name: "Blair" }], draft: [{ candidateId: "1", inPerson: 60, online: 0 }, { candidateId: "2", inPerson: 0, online: 30 }], draftNoCandidate: { inPerson: 5, online: 5 } })
  return toPublicElection({ id: "991d17cd-2c69-4825-bd38-e44c61783f04", state, revision: 1, updatedAt: "2026-10-17T12:00:00Z", spreadsheetId: null, syncError: null, syncedRevision: 1 })!
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals() })

describe("public election visual", () => {
  it("shows bars, X, and the threshold without vote or correction controls", async () => {
    const user = userEvent.setup()
    render(<PublicElectionDisplay initialElection={fixture()} />)
    expect(screen.getByRole("meter", { name: "Alex vote share" })).toHaveAttribute("aria-valuenow", "60")
    expect(screen.getByRole("meter", { name: "X / no candidate vote share" })).toHaveAttribute("aria-valuenow", "10")
    expect(screen.getByText("67")).toBeInTheDocument()
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /record|correct|publish|save/i })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /Alt Delegate/ }))
    expect(screen.getByText("Waiting for the candidates")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Follow live office" }))
    expect(screen.getByRole("meter", { name: "Alex vote share" })).toBeInTheDocument()
  })
  it("removes counts on the next refresh after the teller stops sharing", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })))
    render(<PublicElectionDisplay initialElection={fixture()} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(screen.getByRole("heading", { name: "Display is not available" })).toBeInTheDocument()
    expect(screen.queryByText("Alex")).not.toBeInTheDocument()
    expect(screen.queryByRole("meter")).not.toBeInTheDocument()
  })
  it("updates saved counts from the anonymous API", async () => {
    const user = userEvent.setup()
    const updated = fixture()
    updated.revision = 2
    updated.offices[0].ballots[0].candidates[0].total = 62
    updated.offices[0].ballots[0].candidates[0].share = 0.62
    const fetchMock = vi.fn(async () => Response.json(updated))
    vi.stubGlobal("fetch", fetchMock)
    render(<PublicElectionDisplay initialElection={fixture()} />)
    // Returning to the tab triggers an immediate refresh as well as the interval.
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")) })
    await waitFor(() => expect(screen.getByRole("meter", { name: "Alex vote share" })).toHaveAttribute("aria-valuenow", "62"))
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/elections/"), expect.objectContaining({ cache: "no-store" }))
    await user.click(screen.getByRole("button", { name: /Alt Delegate/ }))
  })
})

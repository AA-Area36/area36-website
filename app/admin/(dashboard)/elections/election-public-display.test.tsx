import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { createElectionState, type ElectionRecord } from "@/lib/elections/model"
import { ElectionPublicDisplay } from "./election-public-display"

const fixture = (): ElectionRecord => ({ id: "991d17cd-2c69-4825-bd38-e44c61783f04", state: createElectionState("Elections", "2026-10-17"), revision: 0, updatedAt: "2026-10-17T12:00:00Z", spreadsheetId: null, syncedRevision: 0, syncError: null })

describe("public display controls", () => {
  it("publishes the selected office, changes the followed office, and stops sharing", async () => {
    const user = userEvent.setup()
    const election = fixture()
    const save = vi.fn(async () => true)
    const { rerender } = render(<ElectionPublicDisplay election={election} officeIndex={0} onCommand={save} canWrite disabled={false} />)
    expect(screen.queryByRole("link", { name: "Open public display" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Publish display" }))
    expect(save).toHaveBeenLastCalledWith({ type: "display", officeIndex: 0, enabled: true })
    election.state.publicDisplay = { enabled: true, officeIndex: 0 }
    rerender(<ElectionPublicDisplay election={election} officeIndex={2} onCommand={save} canWrite disabled={false} />)
    expect(screen.getByRole("link", { name: "Open public display" })).toHaveAttribute("href", `/elections/${election.id}`)
    await user.click(screen.getByRole("button", { name: "Show Chair" }))
    expect(save).toHaveBeenLastCalledWith({ type: "display", officeIndex: 2, enabled: true })
    await user.click(screen.getByRole("button", { name: "Stop sharing" }))
    expect(save).toHaveBeenLastCalledWith({ type: "display", officeIndex: 2, enabled: false })
  })
  it("requires write access and waits for unsaved tally work", () => {
    const election = fixture()
    const save = vi.fn(async () => true)
    const { rerender } = render(<ElectionPublicDisplay election={election} officeIndex={0} onCommand={save} canWrite={false} disabled={false} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    rerender(<ElectionPublicDisplay election={election} officeIndex={0} onCommand={save} canWrite disabled />)
    expect(screen.getByRole("button", { name: "Publish display" })).toBeDisabled()
  })
})

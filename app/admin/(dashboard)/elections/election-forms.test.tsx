import { useState } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { applyCommand, createElectionState } from "@/lib/elections/model"
import { BallotHistory, CandidateSetup, CountInput, TallyForm } from "./election-forms"

describe("election entry controls", () => {
  it("adds and removes individual candidate fields and submits distinct names", async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => true)
    render(<CandidateSetup officeIndex={0} initialNames={[]} onCommand={save} onDirty={vi.fn()} disabled={false} />)
    await user.type(screen.getByLabelText("Candidate 1 name"), "Alex")
    await user.type(screen.getByLabelText("Candidate 2 name"), "Blair")
    await user.click(screen.getByRole("button", { name: "Add candidate" }))
    await user.type(screen.getByLabelText("Candidate 3 name"), "Casey")
    await user.click(screen.getByRole("button", { name: "Remove candidate 2" }))
    expect(screen.queryByLabelText("Candidate 3 name")).not.toBeInTheDocument()
    expect(screen.getByLabelText("Candidate 2 name")).toHaveValue("Casey")
    await user.click(screen.getByRole("button", { name: "Start ballot 1" }))
    expect(save).toHaveBeenCalledWith({ type: "candidates", officeIndex: 0, names: ["Alex", "Casey"] })
  })
  it("supports plus, minus, and direct entry without negative counts", async () => {
    function ControlledCount() {
      const [value, setValue] = useState("0")
      return <CountInput id="test-count" label="In person votes for Alex" value={value} onChange={setValue} />
    }
    const user = userEvent.setup()
    render(<ControlledCount />)
    const down = screen.getByRole("button", { name: "Decrease in person votes for alex by one" })
    const up = screen.getByRole("button", { name: "Increase in person votes for alex by one" })
    expect(down).toBeDisabled()
    await user.click(up); await user.click(up); await user.click(down)
    expect(screen.getByRole("spinbutton")).toHaveValue(1)
    await user.clear(screen.getByRole("spinbutton")); await user.type(screen.getByRole("spinbutton"), "7")
    expect(screen.getByRole("spinbutton")).toHaveValue(7)
  })
  it("includes X in displayed percentages and keeps recording available when counts differ", async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => true)
    const state = applyCommand(createElectionState("Review", "2026-10-11"), { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] }, "teller", "now")
    render(<TallyForm office={state.offices[0]} officeIndex={0} expectedDefault={100} onCommand={save} onDirty={vi.fn()} disabled={false} presentation={false} />)
    const review = screen.getByRole("button", { name: "Review ballot 1" })
    expect(review).toBeEnabled()
    for (const [name, value] of [["In person votes for Alex", "70"], ["Online votes for Blair", "20"], ["In person votes for X / no candidate", "10"]]) {
      await user.clear(screen.getByRole("spinbutton", { name })); await user.type(screen.getByRole("spinbutton", { name }), value)
    }
    expect(screen.getByText("70.0%")).toBeInTheDocument()
    expect(screen.getByText("10.0%")).toBeInTheDocument()
    expect(screen.getByText("Counts align")).toBeInTheDocument()
    expect(review).toBeEnabled()
    await user.click(screen.getByRole("button", { name: "Increase online votes for x / no candidate by one" }))
    expect(review).toBeEnabled()
    expect(screen.getByText("1 more vote than expected")).toBeInTheDocument()
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: "draft", expectedVotes: 100, noCandidate: { inPerson: 10, online: 1 } })))
  })
  it.each([{ total: 90, direction: "under" }, { total: 110, direction: "over" }])("records $total votes against 100 expected with a $direction warning", async ({ total, direction }) => {
    const user = userEvent.setup()
    const save = vi.fn(async () => true)
    const state = applyCommand(createElectionState("Review", "2026-10-11"), { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] }, "teller", "now")
    state.offices[0].draft = [{ candidateId: "1", inPerson: total / 2, online: 0 }, { candidateId: "2", inPerson: total / 2, online: 0 }]
    render(<TallyForm office={state.offices[0]} officeIndex={0} expectedDefault={100} onCommand={save} onDirty={vi.fn()} disabled={false} presentation={false} />)
    await user.click(screen.getByRole("button", { name: "Review ballot 1" }))
    expect(screen.getByText(new RegExp(`10 votes ${direction} expected`))).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Record ballot" }))
    expect(save).toHaveBeenCalledWith({ type: "finalize", officeIndex: 0, votes: state.offices[0].draft, expectedVotes: 100, noCandidate: { inPerson: 0, online: 0 } })
  })
  it("still requires an expected count and valid whole-number counts", async () => {
    const user = userEvent.setup()
    const state = applyCommand(createElectionState("Review", "2026-10-11"), { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] }, "teller", "now")
    render(<TallyForm office={state.offices[0]} officeIndex={0} expectedDefault={null} onCommand={vi.fn(async () => true)} onDirty={vi.fn()} disabled={false} presentation={false} />)
    const review = screen.getByRole("button", { name: "Review ballot 1" })
    expect(review).toBeDisabled()
    await user.type(screen.getByRole("spinbutton", { name: "Expected votes" }), "100")
    expect(review).toBeEnabled()
    await user.clear(screen.getByRole("spinbutton", { name: "In person votes for Alex" }))
    expect(review).toBeDisabled()
  })
  it("shows a saved count warning and lets corrections retain an expected-count difference", async () => {
    const user = userEvent.setup()
    const save = vi.fn(async () => true)
    let state = applyCommand(createElectionState("Review", "2026-10-11"), { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] }, "teller", "now")
    state = applyCommand(state, { type: "finalize", officeIndex: 0, votes: [{ candidateId: "1", inPerson: 45, online: 0 }, { candidateId: "2", inPerson: 45, online: 0 }], expectedVotes: 100 }, "teller", "now")
    render(<BallotHistory office={state.offices[0]} expanded={true} officeIndex={0} onCommand={save} onDirty={vi.fn()} canCorrect={true} disabled={false} canOpen={true} />)
    expect(screen.getByText("Ballot 1 · Count differs")).toBeInTheDocument()
    expect(screen.getByText(/10 votes under expected/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Correct ballot 1" }))
    await user.click(screen.getByRole("button", { name: "Increase in person votes for alex by one" }))
    await user.type(screen.getByRole("textbox", { name: "Reason for correction" }), "Corrected teller count")
    await user.click(screen.getByRole("button", { name: "Save correction" }))
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: "correct", ballotNumber: 1, expectedVotes: 100, votes: [{ candidateId: "1", inPerson: 46, online: 0 }, { candidateId: "2", inPerson: 45, online: 0 }] }))
  })
})

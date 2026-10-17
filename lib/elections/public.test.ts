// @vitest-environment node
import { describe, expect, it } from "vitest"
import { applyCommand, createElectionState, type ElectionRecord } from "./model"
import { toPublicElection } from "./public"

function fixture() {
  let state = createElectionState("Officer elections", "2026-10-17")
  state = applyCommand(state, { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] }, "private@area36.org", "2026-10-17T12:00:00Z")
  state = applyCommand(state, { type: "draft", officeIndex: 0, expectedVotes: 105, noCandidate: { inPerson: 5, online: 5 }, votes: [{ candidateId: "1", inPerson: 60, online: 0 }, { candidateId: "2", inPerson: 0, online: 30 }] }, "private@area36.org", "2026-10-17T12:00:00Z")
  return { id: "991d17cd-2c69-4825-bd38-e44c61783f04", revision: 2, state, updatedAt: "2026-10-17T12:00:00Z", spreadsheetId: "private-sheet", syncedRevision: 1, syncError: "private sync details" } satisfies ElectionRecord
}

describe("public election projection", () => {
  it("is private by default and can be published and stopped without changing offices", () => {
    const election = fixture()
    expect(toPublicElection(election)).toBeNull()
    const published = applyCommand(election.state, { type: "display", officeIndex: 0, enabled: true }, "admin", "now")
    expect(published.offices).toEqual(election.state.offices)
    expect(toPublicElection({ ...election, state: published })).not.toBeNull()
    const stopped = applyCommand(published, { type: "display", officeIndex: 1, enabled: false }, "admin", "now")
    expect(toPublicElection({ ...election, state: stopped })).toBeNull()
    expect(stopped.offices).toEqual(election.state.offices)
  })
  it("publishes only presentation fields, including X and turnout differences", () => {
    const election = fixture()
    election.state.publicDisplay = { enabled: true, officeIndex: 0 }
    const result = toPublicElection(election)!
    expect(result.offices[0].ballots[0]).toMatchObject({ number: 1, phase: "counting", recorded: 100, expected: 105, difference: -5, threshold: 67, noCandidate: { total: 10, share: 0.1 }, candidates: [{ name: "Alex", share: 0.6 }, { name: "Blair", share: 0.3 }] })
    expect(result.offices[0].winner).toBeNull()
    const serialized = JSON.stringify(result)
    for (const privateValue of ["private@area36.org", "private-sheet", "private sync details", "savedBy", "spreadsheetId", "syncError", "savedAt"]) expect(serialized).not.toContain(privateValue)
  })
  it("includes recorded history without audit actors, and confirms winners only after recording", () => {
    const election = fixture()
    election.state = applyCommand(election.state, { type: "display", officeIndex: 0, enabled: true }, "admin", "now")
    const votes = [{ candidateId: "1", inPerson: 80, online: 0 }, { candidateId: "2", inPerson: 0, online: 10 }]
    election.state = applyCommand(election.state, { type: "draft", officeIndex: 0, votes }, "private@area36.org", "now")
    expect(toPublicElection(election)!.offices[0].winner).toBeNull()
    election.state = applyCommand(election.state, { type: "finalize", officeIndex: 0, votes }, "private@area36.org", "now")
    expect(toPublicElection(election)!.offices[0]).toMatchObject({ winner: "Alex", status: "elected", ballots: [{ phase: "recorded" }] })
    expect(JSON.stringify(toPublicElection(election))).not.toContain("private@area36.org")
  })
  it("retains archived ballots after an earlier correction elects a candidate", () => {
    const election = fixture()
    election.state.publicDisplay = { enabled: true, officeIndex: 0 }
    const votes = [{ candidateId: "1", inPerson: 50, online: 0 }, { candidateId: "2", inPerson: 0, online: 40 }]
    for (let i = 0; i < 2; i++) election.state = applyCommand(election.state, { type: "finalize", officeIndex: 0, votes }, "private@area36.org", "now")
    election.state = applyCommand(election.state, { type: "correct", officeIndex: 0, ballotNumber: 1, expectedVotes: 100, noCandidate: { inPerson: 0, online: 0 }, votes: [{ candidateId: "1", inPerson: 70, online: 0 }, { candidateId: "2", inPerson: 30, online: 0 }], reason: "Private correction explanation" }, "private@area36.org", "now")
    const result = toPublicElection(election)!
    expect(result.offices[0]).toMatchObject({ winner: "Alex", ballots: [{ number: 1, phase: "recorded" }, { number: 2, phase: "archived" }] })
    expect(JSON.stringify(result)).not.toContain("Private correction explanation")
  })
})

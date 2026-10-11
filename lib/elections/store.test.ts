// @vitest-environment node
import { readFileSync } from "node:fs"
import { beforeEach, afterEach, describe, expect, it } from "vitest"
import { createSqliteD1 } from "@/tests/helpers/sqlite-d1"
import { createElection, getElection, mutateElection, ElectionConflict } from "./store"

describe("durable election saves", () => {
  let database: ReturnType<typeof createSqliteD1>
  const input = { id: "991d17cd-2c69-4825-bd38-e44c61783f04", title: "Area elections", date: "2026-10-10" }
  const actor = "teller@area36.org"
  beforeEach(() => { database = createSqliteD1(); database.sqlite.exec(readFileSync(new URL("../db/migrations/0032_third_legacy_elections.sql", import.meta.url), "utf8")) })
  afterEach(() => database.sqlite.close())
  it("creates one durable record and rejects reuse of a creation id with different details", async () => {
    const first = await createElection(database.client, input, actor)
    expect(await createElection(database.client, input, actor)).toEqual(first)
    await expect(createElection(database.client, { ...input, title: "Changed" }, actor)).rejects.toThrow("different details")
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM election_revisions").get()?.count).toBe(1)
  })
  it("replays a lost response without adding another ballot or audit revision", async () => {
    await createElection(database.client, input, actor)
    await mutateElection(database.client, { id: input.id, revision: 0, commandId: "setup", command: { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] } }, actor)
    const request = { id: input.id, revision: 1, commandId: "ballot", command: { type: "finalize" as const, officeIndex: 0, expectedVotes: 100, votes: [{ candidateId: "1", inPerson: 60, online: 5 }, { candidateId: "2", inPerson: 30, online: 5 }] } }
    const first = await mutateElection(database.client, request, actor)
    expect(await mutateElection(database.client, request, actor)).toEqual(first)
    expect(first.state.offices[0].ballots).toHaveLength(1)
    expect(database.sqlite.prepare("SELECT COUNT(*) AS count FROM election_revisions").get()?.count).toBe(3)
    await expect(mutateElection(database.client, { ...request, command: { ...request.command, votes: [{ candidateId: "1", inPerson: 0, online: 0 }, { candidateId: "2", inPerson: 0, online: 0 }] } }, actor)).rejects.toThrow("different details")
  })
  it("prevents two tabs from overwriting each other and retains the correction reason", async () => {
    await createElection(database.client, input, actor)
    const setup = { type: "candidates" as const, officeIndex: 0, names: ["Alex", "Blair"] }
    const results = await Promise.allSettled([
      mutateElection(database.client, { id: input.id, revision: 0, commandId: "tab-one", command: setup }, actor),
      mutateElection(database.client, { id: input.id, revision: 0, commandId: "tab-two", command: setup }, actor),
    ])
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1)
    expect(results.find(result => result.status === "rejected")).toMatchObject({ reason: expect.any(ElectionConflict) })
    await mutateElection(database.client, { id: input.id, revision: 1, commandId: "final", command: { type: "finalize", officeIndex: 0, expectedVotes: 100, votes: [{ candidateId: "1", inPerson: 70, online: 0 }, { candidateId: "2", inPerson: 30, online: 0 }] } }, actor)
    await mutateElection(database.client, { id: input.id, revision: 2, commandId: "correct", command: { type: "correct", officeIndex: 0, ballotNumber: 1, expectedVotes: 100, votes: [{ candidateId: "1", inPerson: 60, online: 0 }, { candidateId: "2", inPerson: 40, online: 0 }], reason: "Corrected teller count" } }, actor)
    expect((await getElection(database.client, input.id))?.revision).toBe(3)
    expect(database.sqlite.prepare("SELECT command_json FROM election_revisions WHERE command_id = 'correct'").get()?.command_json).toContain("Corrected teller count")
    expect(database.sqlite.prepare("SELECT state_json FROM election_revisions WHERE command_id = 'final'").get()?.state_json).toContain('"winnerId":"1"')
  })
})

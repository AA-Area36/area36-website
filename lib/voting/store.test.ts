// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createSqliteD1 } from "@/tests/helpers/sqlite-d1"
import { createElection, getElection, mutateElection } from "@/lib/elections/store"
import { getPublicElection } from "@/lib/elections/public"
import { castVote, findRoomByCode, getPublicRoom, getUnusedCredentials, manageRoom, normalizeVotingCode, openElectionRoom, openMotionRoom } from "./store"

const electionId = "9ad81107-9bc1-48f3-a922-92eea3b2013b"
const roomId = "cd03c9e4-4eb5-450c-9319-918d53edb33c"
const actor = "teller@example.org"
const base = { id: roomId, quorumKey: "QuorumTest123", title: "Approve the budget?", actor, seats: ["District 7 GSR", "District 8 DCM"] }

describe("anonymous voting rooms", () => {
  let database: ReturnType<typeof createSqliteD1>
  beforeEach(() => { database = createSqliteD1(); database.migrate() })
  afterEach(() => database.sqlite.close())

  it("counts one concurrent vote per eligible seat and publishes only closed motion totals", async () => {
    const db = database.client
    const room = await openMotionRoom(db, base)
    expect(await openMotionRoom(db, base)).toEqual(room)
    expect(await getPublicRoom(db, roomId)).toMatchObject({ roomCode: null, results: null })
    await manageRoom(db, roomId, "show", actor)
    expect((await getPublicRoom(db, roomId))?.roomCode).toBe(room.roomCode)
    const rotated = await manageRoom(db, roomId, "rotate", actor)
    expect(await findRoomByCode(db, room.roomCode)).toBeNull()
    expect(await findRoomByCode(db, rotated.roomCode)).toEqual({ pageId: roomId, roomId })
    const [first, second] = await getUnusedCredentials(db, roomId)
    const input = { id: roomId, roomCode: rotated.roomCode, voterCode: normalizeVotingCode(first.code), choiceId: "yes", receipt: crypto.randomUUID() }
    expect(await castVote(db, { ...input, roomCode: room.roomCode })).toBe(false)
    expect(await castVote(db, { ...input, voterCode: "0000000000000000" })).toBe(false)
    expect(await castVote(db, { ...input, choiceId: "missing" })).toBe(false)
    const raced = await Promise.all([castVote(db, input), castVote(db, { ...input, choiceId: "no", receipt: crypto.randomUUID() })])
    expect(raced.filter(Boolean)).toHaveLength(1)
    expect(await castVote(db, input)).toBe(raced[0])
    expect(await getUnusedCredentials(db, roomId)).toEqual([second])
    expect((await getPublicRoom(db, roomId))?.results).toBeNull()
    expect((await manageRoom(db, roomId, "publish", actor)).resultsPublished).toBe(false)
    await manageRoom(db, roomId, "close", actor)
    expect(await castVote(db, { ...input, voterCode: normalizeVotingCode(second.code), receipt: crypto.randomUUID() })).toBe(false)
    expect(await castVote(db, input)).toBe(raced[0])
    expect((await getPublicRoom(db, roomId))?.results).toBeNull()
    await manageRoom(db, roomId, "publish", actor)
    const publicRoom = await getPublicRoom(db, roomId)
    expect(publicRoom?.results?.map(item => item.votes)).toEqual(raced[0] ? [1, 0, 0] : [0, 1, 0])
    expect(JSON.stringify(publicRoom)).not.toContain(first.label)
    expect(database.sqlite.prepare("SELECT count(*) AS count FROM voting_cast_input").get()?.count).toBe(0)
  })

  it("locks the active candidate list and uses website counts when recording a Third Legacy ballot", async () => {
    const db = database.client
    await createElection(db, { id: electionId, title: "Assembly election", date: "2026-10-17" }, actor)
    const change = (revision: number, command: Parameters<typeof mutateElection>[1]["command"]) =>
      mutateElection(db, { id: electionId, revision, commandId: crypto.randomUUID(), command }, actor)
    await change(0, { type: "candidates", officeIndex: 0, names: ["Alex", "Blair"] })
    await change(1, { type: "display", officeIndex: 0, enabled: true })
    const room = await openElectionRoom(db, { ...base, electionId, revision: 2, officeIndex: 0, ballotNumber: 1, choices: [{ id: "1", label: "Alex" }, { id: "2", label: "Blair" }, { id: "no-candidate", label: "X / no candidate" }] })
    expect((await getPublicElection(db, electionId))?.votingRoom).toEqual({ code: null })
    expect((await getPublicElection(db, electionId))?.offices[0].ballots).toEqual([])
    const [first, second] = await getUnusedCredentials(db, roomId)
    for (const [choiceId, code] of [["2", first.code], ["no-candidate", second.code]]) {
      expect(await castVote(db, { id: roomId, roomCode: room.roomCode, voterCode: normalizeVotingCode(code), choiceId, receipt: crypto.randomUUID() })).toBe(true)
    }
    const votes = [{ candidateId: "1", inPerson: 2, online: 88 }, { candidateId: "2", inPerson: 1, online: 99 }]
    await expect(change(2, { type: "finalize", officeIndex: 0, votes, expectedVotes: 5 })).rejects.toThrow("Close online voting")
    await expect(change(2, { type: "candidates", officeIndex: 0, names: ["Other", "Names"] })).rejects.toThrow("Finish recording")
    await manageRoom(db, roomId, "close", actor)
    await change(2, { type: "finalize", officeIndex: 0, votes, expectedVotes: 8 })
    const saved = await getElection(db, electionId)
    expect(saved?.state.offices[0].ballots[0]).toMatchObject({ expectedVotes: 8, votes: [{ inPerson: 2, online: 0 }, { inPerson: 1, online: 1 }], noCandidate: { online: 1 } })
    expect((await getPublicElection(db, electionId))?.offices[0].ballots[0]).toMatchObject({ recorded: 5, phase: "recorded" })
  })
})

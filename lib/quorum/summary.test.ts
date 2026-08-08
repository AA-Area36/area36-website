import { beforeEach, describe, expect, it, vi } from "vitest"
import type { QuorumEvent } from "./types"

const { getQuorumCountingRows } = vi.hoisted(() => ({
  getQuorumCountingRows: vi.fn(),
}))

vi.mock("./google", () => ({ getQuorumCountingRows }))

import { buildQuorumSummary } from "./summary"

const event: QuorumEvent = {
  eventKey: "public-key",
  spreadsheetId: "private-spreadsheet-id",
  title: "Area Committee Meeting",
  eventDate: "2026-08-08",
  quorumTarget: 1,
  status: "open",
  featured: true,
  webViewLink: "https://docs.google.com/private",
}

describe("public quorum summary", () => {
  beforeEach(() => getQuorumCountingRows.mockReset())

  it("returns aggregate fields without Google identifiers or attendee details", async () => {
    getQuorumCountingRows.mockResolvedValue([
      {
        submissionId: "submission",
        submittedAt: "2026-08-08T12:00:00.000Z",
        servicePosition: "gsr",
        positionDetail: "",
        isAlternate: false,
        seatKey: "gsr:3:new-hope",
        adminVotingOverride: "",
        counted: true,
      },
    ])

    const summary = await buildQuorumSummary(event)
    expect(Object.keys(summary).sort()).toEqual([
      "nonVoting",
      "quorumMet",
      "status",
      "target",
      "total",
      "updatedAt",
      "voting",
    ])
    expect(JSON.stringify(summary)).not.toContain(event.spreadsheetId)
    expect(JSON.stringify(summary)).not.toContain("email")
  })
})

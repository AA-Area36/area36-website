import { describe, expect, it } from "vitest"
import { toPublicQuorumEvent, type QuorumEvent } from "./types"

describe("public quorum event serialization", () => {
  it("removes spreadsheet and Drive fields", () => {
    const event: QuorumEvent = {
      eventKey: "event-key",
      spreadsheetId: "private-sheet",
      title: "Area Assembly",
      eventDate: "2026-08-08",
      quorumTarget: 35,
      status: "open",
      featured: true,
      webViewLink: "https://docs.google.com/private",
    }
    expect(toPublicQuorumEvent(event)).toEqual({
      eventKey: "event-key",
      title: "Area Assembly",
      eventDate: "2026-08-08",
      status: "open",
    })
  })
})

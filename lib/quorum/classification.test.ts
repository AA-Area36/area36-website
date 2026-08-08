import { describe, expect, it } from "vitest"
import { buildQuorumSeatKey, classifyQuorumRows } from "./classification"
import type { QuorumCountingRow } from "./types"

function row(overrides: Partial<QuorumCountingRow> & Pick<QuorumCountingRow, "submissionId">): QuorumCountingRow {
  return {
    submittedAt: `2026-08-08T10:00:0${overrides.submissionId.length}.000Z`,
    servicePosition: "general_member",
    positionDetail: "",
    isAlternate: false,
    seatKey: "",
    adminVotingOverride: "",
    counted: true,
    ...overrides,
  }
}

describe("quorum classification", () => {
  it("allows one alternate to vote only when the primary is absent", () => {
    const altOnly = classifyQuorumRows([
      row({ submissionId: "alt", servicePosition: "alt_dcm", isAlternate: true, seatKey: "dcm:3" }),
    ])
    expect(altOnly.voting).toBe(1)

    const primaryAndAlt = classifyQuorumRows([
      row({ submissionId: "alt", servicePosition: "alt_dcm", isAlternate: true, seatKey: "dcm:3" }),
      row({ submissionId: "primary", servicePosition: "dcm", seatKey: "dcm:3" }),
    ])
    expect(primaryAndAlt.voting).toBe(1)
    expect(primaryAndAlt.rows.find((item) => item.submissionId === "primary")?.effectiveClassification).toBe("voting")
    expect(primaryAndAlt.rows.find((item) => item.submissionId === "alt")?.effectiveClassification).toBe("non_voting")
  })

  it("keeps duplicate exclusion separate from voting overrides", () => {
    const result = classifyQuorumRows([
      row({ submissionId: "one", servicePosition: "gsr", seatKey: "gsr:1:hope" }),
      row({ submissionId: "duplicate", servicePosition: "gsr", seatKey: "gsr:1:hope", counted: false }),
      row({ submissionId: "member", servicePosition: "general_member" }),
    ])
    expect(result).toMatchObject({ voting: 1, nonVoting: 1, total: 2 })
  })

  it("lets an admin select the voting representative for a seat", () => {
    const result = classifyQuorumRows([
      row({ submissionId: "primary", servicePosition: "dcm", seatKey: "dcm:8", adminVotingOverride: "non_voting" }),
      row({ submissionId: "alt", servicePosition: "alt_dcm", isAlternate: true, seatKey: "dcm:8", adminVotingOverride: "voting" }),
    ])
    expect(result.rows.find((item) => item.submissionId === "alt")?.effectiveClassification).toBe("voting")
    expect(result.voting).toBe(1)
  })

  it("builds stable normalized seat keys", () => {
    expect(buildQuorumSeatKey({ servicePosition: "gsr", district: "3", homeGroup: "  New Høpe Group! ", positionDetail: "", email: "" })).toBe("gsr:3:new-h-pe-group")
    expect(buildQuorumSeatKey({ servicePosition: "area_officer", district: "", homeGroup: "", positionDetail: "Area Chairperson", email: "" })).toBe("area-officer:area-chairperson")
  })
})

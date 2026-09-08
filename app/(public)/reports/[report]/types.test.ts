import { describe, expect, it } from "vitest"
import { redactPublicReportDiagnostics, type ReportData } from "./types"

describe("public report diagnostics", () => {
  it("removes legacy raw messages without mutating the stored report", () => {
    const stored = {
      errors: {
        byKind: [{ errorKind: "FETCH_FAILED", count: 1 }],
        topErrors: [
          {
            errorKind: "FETCH_FAILED",
            fingerprint: "fingerprint",
            count: 1,
            sampleMessage: "sentinel private diagnostic",
            sampleRoute: "/api/example",
          },
        ],
      },
    } as unknown as ReportData

    const publicReport = redactPublicReportDiagnostics(stored)

    expect(publicReport.errors.topErrors[0]).not.toHaveProperty("sampleMessage")
    expect(stored.errors.topErrors[0].sampleMessage).toBe("sentinel private diagnostic")
  })
})

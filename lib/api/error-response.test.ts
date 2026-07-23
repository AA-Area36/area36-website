import { describe, expect, it, vi } from "vitest"
import {
  createApiErrorResponse,
  createApiRequestId,
  getRedactedErrorMetadata,
} from "./error-response"

describe("API error responses", () => {
  it("returns a generic message and correlation ID without raw exception text", async () => {
    const requestId = "request-123"
    const internalMarker =
      "SQLITE_ERROR private-path /Users/example secret-service-account@example.test"
    const response = createApiErrorResponse({
      message: "Events are temporarily unavailable.",
      requestId,
      details: { ok: false },
    })

    expect(response.status).toBe(500)
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(response.headers.get("x-request-id")).toBe(requestId)
    const responseText = await response.clone().text()
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "Events are temporarily unavailable.",
      requestId,
    })
    expect(responseText).not.toContain(internalMarker)
  })

  it("generates opaque request IDs", () => {
    const randomUUID = vi
      .spyOn(crypto, "randomUUID")
      .mockReturnValue("00000000-0000-4000-8000-000000000036")

    expect(createApiRequestId()).toBe("00000000-0000-4000-8000-000000000036")
    randomUUID.mockRestore()
  })

  it("logs only the exception class through the redacted metadata helper", () => {
    const error = new Error("private upstream response and local path")
    error.stack = "Error: private upstream response\n at /private/source.ts:12"

    expect(getRedactedErrorMetadata(error)).toEqual({ errorName: "Error" })
    expect(JSON.stringify(getRedactedErrorMetadata(error))).not.toContain(
      "private upstream",
    )
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { createEventUploadToken, verifyEventUploadToken } from "./upload-token"

describe("event upload token claims", () => {
  beforeEach(() => {
    vi.stubEnv("UPLOAD_TOKEN_SECRET", "test-only-upload-secret")
  })

  it("returns stable server-side claims for a valid event token", async () => {
    const token = await createEventUploadToken("event-1", 60_000)
    expect(token).not.toBeNull()

    const first = await verifyEventUploadToken(token!, "event-1")
    const second = await verifyEventUploadToken(token!, "event-1")

    expect(first).toMatchObject({ eventId: "event-1" })
    expect(first?.expiresAt).toBeGreaterThan(Date.now())
    expect(first?.tokenId).toMatch(/^v1:/)
    expect(second?.tokenId).toBe(first?.tokenId)
  })

  it("rejects tokens for another event or an expired window", async () => {
    const token = await createEventUploadToken("event-1", 60_000)
    const expired = await createEventUploadToken("event-1", -1)

    await expect(verifyEventUploadToken(token!, "event-2")).resolves.toBeNull()
    await expect(verifyEventUploadToken(expired!, "event-1")).resolves.toBeNull()
  })
})

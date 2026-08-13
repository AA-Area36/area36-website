import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  signUnlockCookie,
  UNLOCK_COOKIE_MAX_AGE_MS,
  verifyUnlockCookie,
} from "./unlock-cookie"

describe("unlock cookie lifetime", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"))
    vi.stubEnv("UNLOCK_COOKIE_SECRET", "test-secret-with-sufficient-entropy")
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it("accepts a valid cookie within the server lifetime", async () => {
    const value = await signUnlockCookie(["file-1"])
    expect(value).not.toBeNull()
    await expect(verifyUnlockCookie(value!)).resolves.toMatchObject({ ids: ["file-1"] })
  })

  it("rejects a validly signed cookie after seven days", async () => {
    const value = await signUnlockCookie(["file-1"])
    vi.advanceTimersByTime(UNLOCK_COOKIE_MAX_AGE_MS + 1)
    await expect(verifyUnlockCookie(value!)).resolves.toBeNull()
  })

  it("rejects a cookie issued too far in the future", async () => {
    vi.setSystemTime(new Date("2026-07-02T12:00:00Z"))
    const value = await signUnlockCookie(["file-1"])
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"))
    await expect(verifyUnlockCookie(value!)).resolves.toBeNull()
  })
})

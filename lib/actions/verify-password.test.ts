import { beforeEach, describe, expect, it, vi } from "vitest"

const getDb = vi.fn()
const checkRateLimit = vi.fn()
const getClientIp = vi.fn()
const verifyPassword = vi.fn()
const setUnlockedFolder = vi.fn()
const setUnlockedFile = vi.fn()

vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("@/lib/security/rate-limit", () => ({ checkRateLimit, getClientIp }))
vi.mock("@/lib/security/passwords", () => ({ verifyPassword }))
vi.mock("@/lib/recordings/session", () => ({ setUnlockedFolder }))
vi.mock("@/lib/files/session", () => ({ setUnlockedFile }))

const GENERIC_ERROR = "Unable to unlock. Check the password and try again later."

function mockDbRows(rows: unknown[]) {
  const query = {
    limit: vi.fn().mockResolvedValue(rows),
    then: (
      onFulfilled: (value: unknown[]) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => Promise.resolve(rows).then(onFulfilled, onRejected),
  }
  getDb.mockResolvedValue({
    select: () => ({
      from: () => ({
        where: () => query,
      }),
    }),
  })
}

describe("password unlock actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getClientIp.mockResolvedValue("203.0.113.7")
    checkRateLimit.mockResolvedValue({ ok: true })
  })

  it("enforces both client-wide and resource-specific attempt limits", async () => {
    checkRateLimit
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })
    const { verifyFolderPassword } = await import("./verify-password")

    const result = await verifyFolderPassword("folder-1", "guess")

    expect(result).toEqual({ success: false, error: GENERIC_ERROR })
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      1,
      "unlock:folder:client:203.0.113.7",
      { limit: 30, windowMs: 600_000 }
    )
    expect(checkRateLimit).toHaveBeenNthCalledWith(
      2,
      "unlock:folder:resource:203.0.113.7:folder-1",
      { limit: 5, windowMs: 600_000 }
    )
    expect(getDb).not.toHaveBeenCalled()
  })

  it("fails closed with the same response when shared throttling is unavailable", async () => {
    checkRateLimit.mockResolvedValue({ ok: false, source: "unavailable" })
    const { verifyFilePassword } = await import("./verify-password")

    await expect(verifyFilePassword("file-1", "guess")).resolves.toEqual({
      success: false,
      error: GENERIC_ERROR,
    })
    expect(getDb).not.toHaveBeenCalled()
  })

  it("rejects oversized password input before database or password-hash work", async () => {
    const { verifyFolderPassword } = await import("./verify-password")

    await expect(verifyFolderPassword("folder-1", "x".repeat(257))).resolves.toEqual({
      success: false,
      error: GENERIC_ERROR,
    })
    expect(getClientIp).not.toHaveBeenCalled()
    expect(getDb).not.toHaveBeenCalled()
    expect(verifyPassword).not.toHaveBeenCalled()
  })

  it("does not reveal whether a folder exists or a password was wrong", async () => {
    const { verifyFolderPassword } = await import("./verify-password")

    mockDbRows([])
    const missing = await verifyFolderPassword("folder-1", "guess")

    mockDbRows([{ driveId: "folder-1", password: "stored-hash" }])
    verifyPassword.mockResolvedValue(false)
    const wrong = await verifyFolderPassword("folder-1", "guess")

    expect(missing).toEqual({ success: false, error: GENERIC_ERROR })
    expect(wrong).toEqual(missing)
    expect(setUnlockedFolder).not.toHaveBeenCalled()
  })

  it("unlocks a folder only after a permitted, valid password attempt", async () => {
    mockDbRows([{ driveId: "folder-1", password: "stored-hash" }])
    verifyPassword.mockResolvedValue(true)
    const { verifyFolderPassword } = await import("./verify-password")

    await expect(verifyFolderPassword("folder-1", "correct")).resolves.toEqual({
      success: true,
    })
    expect(setUnlockedFolder).toHaveBeenCalledWith("folder-1")
  })
})

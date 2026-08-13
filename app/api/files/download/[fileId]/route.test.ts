import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
  getAllowedGDriveRootIds,
} = vi.hoisted(() => ({
  validateFileAccess: vi.fn(),
  getGDriveEnv: vi.fn(),
  getGDriveCredentials: vi.fn(),
  getAllowedGDriveRootIds: vi.fn(),
}))
vi.mock("@/lib/files/access", () => ({
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
  getAllowedGDriveRootIds,
}))

import { HEAD } from "./route"

describe("protected file download boundary", () => {
  beforeEach(() => {
    getGDriveEnv.mockResolvedValue({ GDRIVE_SERVICE_ACCOUNT_EMAIL: "configured" })
    getGDriveCredentials.mockResolvedValue({ clientEmail: "configured" })
    getAllowedGDriveRootIds.mockReturnValue(["resources-root"])
    validateFileAccess.mockReset()
  })

  it("returns a password challenge without fetching protected content", async () => {
    validateFileAccess.mockResolvedValue({ valid: false, requiresPassword: true })
    const response = await HEAD(
      new NextRequest("https://area36.org/api/files/download/file-1"),
      { params: Promise.resolve({ fileId: "file-1" }) }
    )

    expect(response.status).toBe(403)
    expect(response.headers.get("x-requires-password")).toBe("1")
  })

  it("allows a validated file while retaining private cache semantics", async () => {
    validateFileAccess.mockResolvedValue({ valid: true, filename: "protected.pdf", requiresPassword: false })
    const response = await HEAD(
      new NextRequest("https://area36.org/api/files/download/file-1"),
      { params: Promise.resolve({ fileId: "file-1" }) }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, max-age=60")
  })
})

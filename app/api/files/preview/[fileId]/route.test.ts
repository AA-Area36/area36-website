import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
  getAllowedGDriveRootIds,
  getAccessToken,
} = vi.hoisted(() => ({
  validateFileAccess: vi.fn(),
  getGDriveEnv: vi.fn(),
  getGDriveCredentials: vi.fn(),
  getAllowedGDriveRootIds: vi.fn(),
  getAccessToken: vi.fn(),
}))

vi.mock("@/lib/files/access", () => ({
  validateFileAccess,
  getGDriveEnv,
  getGDriveCredentials,
  getAllowedGDriveRootIds,
}))
vi.mock("@/lib/gdrive/auth", () => ({ getAccessToken }))

import { GET } from "./route"

describe("file preview content boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getGDriveEnv.mockResolvedValue({
      GDRIVE_SERVICE_ACCOUNT_EMAIL: "configured",
    })
    getGDriveCredentials.mockResolvedValue({ clientEmail: "configured" })
    getAllowedGDriveRootIds.mockReturnValue(["resources-root"])
    getAccessToken.mockResolvedValue("redacted")
    validateFileAccess.mockResolvedValue({
      valid: true,
      filename: "agenda.pdf",
      requiresPassword: false,
    })
  })

  it("renders allowlisted PDF content inline with nosniff", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("pdf", {
          headers: { "content-type": "application/pdf" },
        })
      )
    )

    const response = await GET(
      new NextRequest("https://area36.org/api/files/preview/file-1"),
      { params: Promise.resolve({ fileId: "file-1" }) }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="agenda.pdf"'
    )
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  })

  it("rejects active HTML content instead of rendering it inline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<p>fixture</p>", {
          headers: { "content-type": "text/html" },
        })
      )
    )

    const response = await GET(
      new NextRequest("https://area36.org/api/files/preview/file-1"),
      { params: Promise.resolve({ fileId: "file-1" }) }
    )

    expect(response.status).toBe(415)
    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    await expect(response.json()).resolves.toEqual({
      error: "This file type cannot be previewed safely",
    })
  })
})

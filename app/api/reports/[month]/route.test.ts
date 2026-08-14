import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { getDbMock, requireAreaAdminSessionMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  requireAreaAdminSessionMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAreaAdminSession: requireAreaAdminSessionMock,
}))
vi.mock("@/lib/db", () => ({ getDb: getDbMock }))

import { GET } from "./route"

describe("raw monthly report authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAreaAdminSessionMock.mockResolvedValue(null)
  })

  it("denies anonymous raw HTML and JSON before database access", async () => {
    for (const format of ["html", "json"]) {
      const response = await GET(
        new NextRequest(`https://area36.org/api/reports/2026-07?format=${format}`),
        { params: Promise.resolve({ month: "2026-07" }) }
      )
      expect(response.status).toBe(401)
      await expect(response.json()).resolves.toEqual({ error: "Unauthorized" })
    }

    expect(getDbMock).not.toHaveBeenCalled()
  })
})

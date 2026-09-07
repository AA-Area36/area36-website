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

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({ env: { REPORTS_BUCKET: {
    get: vi.fn().mockImplementation(async () => ({ body: "Synthetic private report" })),
  } } }),
}))

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
  it.each(["html", "json"])("prevents browser and shared caching of authorized %s", async (format) => {
    requireAreaAdminSessionMock.mockResolvedValue({ user: { email: "admin@example.com" } })
    getDbMock.mockResolvedValue({ select: () => ({ from: () => ({ where: () => ({ get: async () => ({ r2KeyHtml: "test.html", r2KeyJson: "test.json" }) }) }) }) })
    const response = await GET(new NextRequest(`https://area36.org/api/reports/2026-07?format=${format}`), { params: Promise.resolve({ month: "2026-07" }) })
    expect(response.status).toBe(200)
    expect(response.headers.get("cache-control")).toBe("private, no-store, max-age=0")
    expect(response.headers.get("cloudflare-cdn-cache-control")).toBe("no-store")
  })

})

import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDbMock, requireAreaAdminSessionMock, rowsMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
  requireAreaAdminSessionMock: vi.fn(),
  rowsMock: vi.fn(),
}))

vi.mock("@/lib/auth/guards", () => ({
  requireAreaAdminSession: requireAreaAdminSessionMock,
}))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/db", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/db")>()
  return { ...original, getDb: getDbMock }
})

import { loadContentDocs } from "./actions"

describe("loadContentDocs authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAreaAdminSessionMock.mockResolvedValue(null)
    rowsMock.mockResolvedValue([])
    getDbMock.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({ all: rowsMock })),
        })),
      })),
    })
  })

  it("denies anonymous or non-Area-admin callers before database access", async () => {
    await expect(loadContentDocs("global")).rejects.toThrow("Unauthorized")
    expect(getDbMock).not.toHaveBeenCalled()
  })

  it("returns only the editor fields to an Area administrator", async () => {
    requireAreaAdminSessionMock.mockResolvedValue({
      user: { email: "admin@example.com", isAreaAdmin: true },
    })
    rowsMock.mockResolvedValue([
      {
        locale: "en",
        draftJson: '{"heading":"Draft"}',
        publishedJson: '{"heading":"Published"}',
        draftUpdatedAt: "2026-08-05 12:00:00",
        publishedAt: "2026-08-01 12:00:00",
        updatedBy: "admin@example.com",
      },
    ])

    await expect(loadContentDocs("global")).resolves.toEqual([
      expect.objectContaining({ locale: "en", draftJson: expect.any(String) }),
    ])
    expect(getDbMock).toHaveBeenCalledOnce()
  })
})

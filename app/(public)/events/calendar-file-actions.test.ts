import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getFilesByCategory: vi.fn(),
  getFileMetadata: vi.fn(),
  getGDriveCredentials: vi.fn(),
  withCache: vi.fn(),
}))

vi.mock("@/lib/files/metadata", () => ({ getFilesByCategory: mocks.getFilesByCategory }))
vi.mock("@/lib/gdrive/client", () => ({
  getFileMetadata: mocks.getFileMetadata,
  getGDriveCredentials: mocks.getGDriveCredentials,
}))
vi.mock("@/lib/gdrive/cache", () => ({
  CACHE_KEYS: { annualCalendarFiles: "annual-calendar-files" },
  withCache: mocks.withCache,
}))
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: vi.fn().mockResolvedValue({
    env: {
      GDRIVE_SERVICE_ACCOUNT_EMAIL: "calendar@example.test",
      GDRIVE_PRIVATE_KEY: "redacted-test-key",
      GDRIVE_PRIVATE_KEY_ID: "test-key-id",
    },
  }),
}))

import { getAnnualCalendarFiles } from "./calendar-file-actions"

describe("getAnnualCalendarFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.withCache.mockImplementation(async (key: string, fetcher: () => Promise<unknown>) => {
      void key
      return fetcher()
    })
    mocks.getGDriveCredentials.mockReturnValue({ clientEmail: "calendar@example.test" })
  })

  it("caches the projection and bounds concurrent Drive metadata requests", async () => {
    const records = Array.from({ length: 9 }, (_, index) => ({
      driveId: `drive-${index}`,
      displayName: `Calendar ${index}`,
      password: null,
      category: "Annual Calendar",
    }))
    mocks.getFilesByCategory.mockResolvedValue(records)

    let active = 0
    let maximum = 0
    mocks.getFileMetadata.mockImplementation(async (credentials: unknown, driveId: string) => {
      void credentials
      active++
      maximum = Math.max(maximum, active)
      await new Promise((resolve) => setTimeout(resolve, 2))
      active--
      return {
        id: driveId,
        name: `${driveId}.pdf`,
        mimeType: "application/pdf",
        size: "2048",
      }
    })

    const files = await getAnnualCalendarFiles()

    expect(files).toHaveLength(9)
    expect(maximum).toBe(4)
    expect(mocks.getFileMetadata).toHaveBeenCalledTimes(9)
    expect(mocks.withCache).toHaveBeenCalledWith(
      "annual-calendar-files",
      expect.any(Function),
      { ttl: 300 }
    )
  })
})

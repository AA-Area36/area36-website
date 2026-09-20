import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ unlocked: vi.fn(), db: vi.fn() }))
vi.mock("@/lib/db", () => ({ getDb: mocks.db }))
vi.mock("@/lib/recordings/session", () => ({ getUnlockedFolders: mocks.unlocked }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { GDRIVE_SERVICE_ACCOUNT_EMAIL: "fixture@example.test", GDRIVE_RECORDINGS_FOLDER_ID: "root" } }) }))
vi.mock("@/lib/gdrive/cache", () => ({ withCache: (_key: string, load: () => unknown) => load() }))
vi.mock("@/lib/gdrive/client", () => ({ getGDriveCredentials: () => ({}) }))
vi.mock("@/lib/gdrive/recordings", () => ({ getRecordings: async () => ({
  categories: [{ id: "category", name: "Fixture category", folderId: "folder", count: 1 }],
  recordings: { category: [{ id: "private-file", driveId: "private-file", title: "Private synthetic title", year: 2026, streamUrl: "/private" }] },
}) }))
import { GET } from "./route"
describe("recording metadata authorization", () => {
  beforeEach(() => {
    mocks.unlocked.mockResolvedValue([])
    mocks.db.mockResolvedValue({ select: () => ({ from: async () => [{ id: "public-category-id", driveId: "folder", folderName: "Public category label" }] }) })
  })
  it("redacts locked details and years before sending private no-store JSON", async () => {
    const response = await GET(new NextRequest("https://example.test/api/gdrive/recordings"), { params: Promise.resolve({ type: "recordings" }) })
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    const text = await response.text()
    expect(text).not.toContain("private-file")
    expect(text).not.toContain('"folder"')
    expect(text).not.toContain("Private synthetic title")
    expect(JSON.parse(text).years).toEqual([])
    expect(JSON.parse(text).categories[0].count).toBe(0)
  })
  it("only returns authorized folders and does not share an unlocked response with the next client", async () => {
    mocks.unlocked.mockResolvedValueOnce(["folder"]).mockResolvedValueOnce([])
    const get = () => GET(new NextRequest("https://example.test/api/gdrive/recordings"), { params: Promise.resolve({ type: "recordings" }) })
    expect(await (await get()).text()).toContain("private-file")
    expect(await (await get()).text()).not.toContain("private-file")
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDbMock, getFileMetadataMock, isFolderUnlockedMock } = vi.hoisted(
  () => ({
    getDbMock: vi.fn(),
    getFileMetadataMock: vi.fn(),
    isFolderUnlockedMock: vi.fn(),
  }),
)

vi.mock("@/lib/db", () => ({
  getDb: getDbMock,
}))

vi.mock("@/lib/gdrive/client", () => ({
  getFileMetadata: getFileMetadataMock,
}))

vi.mock("@/lib/recordings/session", () => ({
  isFolderUnlocked: isFolderUnlockedMock,
}))

import { validateRecordingAccess } from "./access"

const credentials = {
  clientEmail: "service@example.invalid",
  privateKey: "redacted",
  privateKeyId: "key-id",
}

function registerFolders(...driveIds: string[]) {
  getDbMock.mockResolvedValue({
    select: () => ({
      from: () => Promise.resolve(driveIds.map((driveId) => ({ driveId }))),
    }),
  })
}

function mockDriveTree(
  files: Record<string, { name: string; parents?: string[] }>,
) {
  getFileMetadataMock.mockImplementation(
    async (_credentials: typeof credentials, fileId: string) => {
      const file = files[fileId]
      if (!file) throw new Error(`Missing test file ${fileId}`)
      return { id: fileId, mimeType: "application/octet-stream", ...file }
    },
  )
}

describe("validateRecordingAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isFolderUnlockedMock.mockResolvedValue(true)
  })

  it("allows a file directly under an unlocked registered folder", async () => {
    registerFolders("category")
    mockDriveTree({
      recording: { name: "recording.mp3", parents: ["category"] },
    })

    await expect(
      validateRecordingAccess("recording", credentials),
    ).resolves.toEqual({
      valid: true,
      folderId: "category",
      filename: "recording.mp3",
    })
  })

  it("allows a recording inside a year subfolder", async () => {
    registerFolders("category")
    mockDriveTree({
      recording: { name: "assembly.mp3", parents: ["year-2026"] },
      "year-2026": { name: "2026", parents: ["category"] },
    })

    await expect(
      validateRecordingAccess("recording", credentials),
    ).resolves.toMatchObject({ valid: true, folderId: "category" })
  })

  it("denies a year-folder recording when its category is locked", async () => {
    registerFolders("category")
    isFolderUnlockedMock.mockResolvedValue(false)
    mockDriveTree({
      recording: { name: "assembly.mp3", parents: ["year-2026"] },
      "year-2026": { name: "2026", parents: ["category"] },
    })

    await expect(
      validateRecordingAccess("recording", credentials),
    ).resolves.toMatchObject({ valid: false, folderId: "category" })
  })

  it("fails closed for unregistered and cyclic ancestry", async () => {
    registerFolders("category")
    mockDriveTree({
      recording: { name: "outside.mp3", parents: ["folder-a"] },
      "folder-a": { name: "A", parents: ["folder-b"] },
      "folder-b": { name: "B", parents: ["folder-a"] },
    })

    await expect(
      validateRecordingAccess("recording", credentials),
    ).resolves.toEqual({ valid: false })
    expect(getFileMetadataMock).toHaveBeenCalledTimes(3)
  })
})

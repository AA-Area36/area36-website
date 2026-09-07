import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDb, getFileMetadata, isFileUnlocked, isFolderUnlocked } = vi.hoisted(() => ({
  getDb: vi.fn(),
  getFileMetadata: vi.fn(),
  isFileUnlocked: vi.fn(),
  isFolderUnlocked: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("@/lib/gdrive/client", () => ({ getFileMetadata }))
vi.mock("@/lib/files/session", () => ({ isFileUnlocked }))
vi.mock("@/lib/recordings/session", () => ({ isFolderUnlocked }))

import { validateFileAccess } from "./access"

const credentials = {
  clientEmail: "service@example.test",
  privateKey: "redacted",
  privateKeyId: "redacted",
}

function mockMetadataRows(rows: unknown[] = [], folders: unknown[] = []) {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => Object.assign(Promise.resolve(folders), { where }))
  getDb.mockResolvedValue({ select: vi.fn(() => ({ from })) })
}

describe("validateFileAccess Drive root boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMetadataRows()
    isFileUnlocked.mockResolvedValue(false)
    isFolderUnlocked.mockResolvedValue(false)
  })

  it("allows a file whose parent is an approved root", async () => {
    getFileMetadata.mockImplementation(async (_credentials, id: string) => ({
      id,
      name: "agenda.pdf",
      mimeType: "application/pdf",
      createdTime: "",
      modifiedTime: "",
      parents: id === "file-1" ? ["resources-root"] : [],
    }))

    await expect(
      validateFileAccess("file-1", credentials, null, ["resources-root"])
    ).resolves.toMatchObject({
      valid: true,
      filename: "agenda.pdf",
      requiresPassword: false,
    })
  })

  it("allows a bounded descendant of an approved root", async () => {
    getFileMetadata.mockImplementation(async (_credentials, id: string) => {
      if (id === "file-1") {
        return {
          id,
          name: "agenda.pdf",
          mimeType: "application/pdf",
          createdTime: "",
          modifiedTime: "",
          parents: ["year-folder"],
        }
      }
      return {
        id,
        name: "2026",
        mimeType: "application/vnd.google-apps.folder",
        createdTime: "",
        modifiedTime: "",
        parents: id === "resources-root" ? [] : ["resources-root"],
      }
    })

    await expect(
      validateFileAccess("file-1", credentials, null, ["resources-root"])
    ).resolves.toMatchObject({ valid: true })
  })

  it("denies a readable file outside every approved root", async () => {
    getFileMetadata.mockImplementation(async (_credentials, id: string) => ({
      id,
      name: id === "file-1" ? "shared.pdf" : "shared-folder",
      mimeType:
        id === "file-1"
          ? "application/pdf"
          : "application/vnd.google-apps.folder",
      createdTime: "",
      modifiedTime: "",
      parents: id === "file-1" ? ["shared-folder"] : [],
    }))

    await expect(
      validateFileAccess("file-1", credentials, null, ["resources-root"])
    ).resolves.toEqual({ valid: false, requiresPassword: false })
  })

  it("fails closed when no approved roots are configured", async () => {
    getFileMetadata.mockResolvedValue({
      id: "file-1",
      name: "shared.pdf",
      mimeType: "application/pdf",
      createdTime: "",
      modifiedTime: "",
      parents: ["shared-folder"],
    })

    await expect(
      validateFileAccess("file-1", credentials, null, [])
    ).resolves.toEqual({ valid: false, requiresPassword: false })
  })
})


describe("generic recording download boundary", () => {
  it("denies a locked recording through a broader public root and allows an unlocked one", async () => {
    mockMetadataRows([], [{ driveId: "locked" }])
    getFileMetadata.mockImplementation(async (_c, id: string) => ({
      id, name: "synthetic.mp3", parents: id === "file" ? ["locked"] : id === "locked" ? ["root"] : [],
    }))
    isFolderUnlocked.mockResolvedValue(false)
    expect(await validateFileAccess("file", credentials, null, ["root"])).toMatchObject({ valid: false })
    isFolderUnlocked.mockResolvedValue(true)
    expect(await validateFileAccess("file", credentials, null, ["root"])).toMatchObject({ valid: true })
  })
})

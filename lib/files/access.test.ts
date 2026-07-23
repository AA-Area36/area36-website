import { beforeEach, describe, expect, it, vi } from "vitest"

const { getDb, getFileMetadata, isFileUnlocked } = vi.hoisted(() => ({
  getDb: vi.fn(),
  getFileMetadata: vi.fn(),
  isFileUnlocked: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ getDb }))
vi.mock("@/lib/gdrive/client", () => ({ getFileMetadata }))
vi.mock("@/lib/files/session", () => ({ isFileUnlocked }))

import { validateFileAccess } from "./access"

const credentials = {
  clientEmail: "service@example.test",
  privateKey: "redacted",
  privateKeyId: "redacted",
}

function mockMetadataRows(rows: unknown[] = []) {
  const limit = vi.fn().mockResolvedValue(rows)
  const where = vi.fn(() => ({ limit }))
  const from = vi.fn(() => ({ where }))
  getDb.mockResolvedValue({ select: vi.fn(() => ({ from })) })
}

describe("validateFileAccess Drive root boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMetadataRows()
    isFileUnlocked.mockResolvedValue(false)
  })

  it("allows a file whose parent is an approved root", async () => {
    getFileMetadata.mockResolvedValue({
      id: "file-1",
      name: "agenda.pdf",
      mimeType: "application/pdf",
      createdTime: "",
      modifiedTime: "",
      parents: ["resources-root"],
    })

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
        parents: ["resources-root"],
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

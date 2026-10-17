import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FileMetadataDialog } from "./file-metadata-dialog"
import { upsertFileMetadata } from "./actions"
import type { FileNode } from "./actions"

vi.mock("./actions", () => ({
  upsertFileMetadata: vi.fn(),
  deleteFileMetadata: vi.fn(),
  getFileMetadataById: vi.fn(),
}))

const file: FileNode = {
  id: "new-file",
  name: "New File.pdf",
  type: "file",
  mimeType: "application/pdf",
  parentId: "area-documents",
}

describe("admin document categories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollIntoView = vi.fn()
    vi.mocked(upsertFileMetadata).mockResolvedValue({
      success: true,
      type: "upsert",
      pendingCacheBustCount: 1,
      file: { driveId: file.id, parentFolderId: file.parentId, displayName: "New File", category: "Safety Resources", isProtected: false },
    })
  })

  it("saves a newly created category with the file for later public grouping", async () => {
    const onSaved = vi.fn()
    render(<FileMetadataDialog file={file} open onOpenChange={vi.fn()} onSaved={onSaved} />)
    fireEvent.click(screen.getByRole("combobox", { name: "Category" }))
    fireEvent.change(screen.getByPlaceholderText("Search or type custom..."), { target: { value: "Safety Resources" } })
    fireEvent.click(await screen.findByRole("option", { name: /Use.*Safety Resources/ }))
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(upsertFileMetadata).toHaveBeenCalledWith({
      driveId: file.id,
      parentFolderId: file.parentId,
      displayName: "New File",
      password: null,
      category: "Safety Resources",
    }))
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({
      file: expect.objectContaining({ category: "Safety Resources" }),
    }))
  })

  it("lets an admin clear a saved category and explains the automatic fallback", async () => {
    render(<FileMetadataDialog file={{ ...file, name: "Budget 2026.pdf", category: "Safety Resources" }} open onOpenChange={vi.fn()} />)
    fireEvent.click(screen.getByRole("button", { name: "Clear category" }))
    expect(screen.getByText(/filename suggestion: Budgets/)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(upsertFileMetadata).toHaveBeenCalledWith(expect.objectContaining({ category: null })))
  })
})

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { FileMetadataDialog } from "./file-metadata-dialog"
import { getFileMetadataById, upsertFileMetadata } from "./actions"
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
    vi.mocked(getFileMetadataById).mockResolvedValue(null)
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
    const editor = screen.getByRole("dialog", { name: "Edit File Details" })
    const options = within(editor).getByRole("dialog", { name: "Category options" })
    fireEvent.change(within(options).getByRole("combobox", { name: "Search categories" }), { target: { value: "Safety Resources" } })
    fireEvent.click(await within(options).findByRole("option", { name: /Use.*Safety Resources/ }))
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
    let resolveMetadata!: (value: Awaited<ReturnType<typeof getFileMetadataById>>) => void
    vi.mocked(getFileMetadataById).mockReturnValue(new Promise(resolve => { resolveMetadata = resolve }))
    render(<FileMetadataDialog file={{ ...file, hasMetadata: true, name: "Budget 2026.pdf", category: "Old Category" }} open onOpenChange={vi.fn()} />)
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Clear category" })).toBeDisabled()
    await act(async () => resolveMetadata({ displayName: "Budget 2026", category: "Safety Resources", isProtected: true }))
    const category = screen.getByRole("combobox", { name: "Category" })
    expect(category).toHaveTextContent("Safety Resources")
    fireEvent.click(screen.getByRole("button", { name: "Clear category" }))
    expect(category).toHaveFocus()
    expect(category).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText(/Automatic category: Budgets/)).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Save" }))
    await waitFor(() => expect(upsertFileMetadata).toHaveBeenCalledWith(expect.objectContaining({
      category: null,
      password: undefined,
    })))
  })
})

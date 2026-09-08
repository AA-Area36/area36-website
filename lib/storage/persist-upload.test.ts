import { describe, expect, it, vi } from "vitest"

import { persistUploadedObject } from "./persist-upload"

describe("persistUploadedObject", () => {
  it("keeps the uploaded object after metadata is persisted", async () => {
    const removeObject = vi.fn()

    await expect(
      persistUploadedObject(async () => "saved", removeObject)
    ).resolves.toBe("saved")
    expect(removeObject).not.toHaveBeenCalled()
  })

  it("removes the uploaded object when metadata persistence fails", async () => {
    const failure = new Error("database unavailable")
    const removeObject = vi.fn().mockResolvedValue(undefined)

    await expect(
      persistUploadedObject(async () => {
        throw failure
      }, removeObject)
    ).rejects.toBe(failure)
    expect(removeObject).toHaveBeenCalledOnce()
  })
})

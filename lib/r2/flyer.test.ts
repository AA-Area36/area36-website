import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ put: vi.fn() }))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: { DRIVE_IMAGES: { put: mocks.put } } }) }))

import { uploadFlyer } from "./index"

const validFlyers = [
  { type: "application/pdf", name: "fixture.pdf", bytes: new TextEncoder().encode("%PDF-1.7 fixture") },
  { type: "image/png", name: "fixture.png", bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]) },
  { type: "image/jpeg", name: "fixture.jpg", bytes: new Uint8Array([255, 216, 255, 224, 0]) },
  { type: "image/gif", name: "fixture.gif", bytes: new TextEncoder().encode("GIF89a fixture") },
  { type: "image/webp", name: "fixture.webp", bytes: new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80, 0]) },
] as const

describe("flyer storage integrity", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(validFlyers)("accepts a valid $type signature", async ({ type, name, bytes }) => {
    const result = await uploadFlyer("fixture", new File([bytes], name, { type }))

    expect(result).toMatchObject({ success: true, fileName: name, fileType: type })
    expect(mocks.put).toHaveBeenCalledOnce()
    expect(mocks.put.mock.calls[0][0]).toMatch(/^flyers\/fixture\/[0-9a-f-]{36}$/)
    expect(mocks.put.mock.calls[0][2]).toMatchObject({ httpMetadata: { contentType: type } })
  })

  it.each(validFlyers)("rejects spoofed $type content before storage", async ({ type, name }) => {
    const result = await uploadFlyer("fixture", new File(["<html>not the declared format"], name, { type }))

    expect(result).toEqual({ success: false, error: "File contents do not match the selected file type." })
    expect(mocks.put).not.toHaveBeenCalled()
  })

  it("rejects a valid signature declared as a different supported MIME type", async () => {
    const png = validFlyers.find(flyer => flyer.type === "image/png")!
    const result = await uploadFlyer("fixture", new File([png.bytes], "fixture.jpg", { type: "image/jpeg" }))

    expect(result.success).toBe(false)
    expect(mocks.put).not.toHaveBeenCalled()
  })

  it("gives simultaneous identically named files distinct keys", async () => {
    const file = new File(["%PDF-1.7 fixture"], "fixture.pdf", { type: "application/pdf" })
    const results = await Promise.all([uploadFlyer("fixture", file), uploadFlyer("fixture", file)])

    expect(results.every(result => result.success)).toBe(true)
    expect(mocks.put).toHaveBeenCalledTimes(2)
    expect(mocks.put.mock.calls[0][0]).not.toBe(mocks.put.mock.calls[1][0])
  })
})

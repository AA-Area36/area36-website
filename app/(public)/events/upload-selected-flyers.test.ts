import { describe, expect, it, vi } from "vitest"
import type { FlyerFile } from "@/components/flyer-upload"
import { uploadSelectedFlyers } from "./upload-selected-flyers"

function flyer(name: string): FlyerFile {
  const file = new File(["data"], name, { type: "application/pdf" })
  return { id: name, file, fileName: name, fileType: file.type, fileSize: file.size }
}

describe("uploadSelectedFlyers", () => {
  it("retains handled and thrown failures for retry", async () => {
    const files = [flyer("ok.pdf"), flyer("denied.pdf"), flyer("network.pdf")]
    const uploader = vi.fn()
      .mockResolvedValueOnce({ success: true, flyer: { id: "1", fileKey: "k", fileName: "ok.pdf", fileType: "application/pdf", fileSize: 4 } })
      .mockResolvedValueOnce({ success: false, error: "Upload not authorized" })
      .mockRejectedValueOnce(new Error("network"))

    const result = await uploadSelectedFlyers("event-1", "token", files, uploader)

    expect(result.failed.map((item) => item.fileName)).toEqual(["denied.pdf", "network.pdf"])
    expect(result.errors).toEqual([
      "denied.pdf: Upload not authorized",
      "network.pdf: upload failed",
    ])
    expect(uploader).toHaveBeenCalledTimes(3)
  })
})

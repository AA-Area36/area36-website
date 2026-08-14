import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RecordingsClient } from "./recordings-client"

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/components/password-dialog", () => ({
  PasswordDialog: () => null,
}))

const categories = [{ id: "area", name: "Area recordings", count: 1 }]
const recordings = {
  area: [{
    id: "recording-1",
    title: "Delegate report",
    category: "area",
    year: 2026,
    driveId: "drive-file-1",
    streamUrl: "unused",
  }],
}

describe("RecordingsClient playback failure", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined)
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("clears the loading state, announces failure, and can retry", async () => {
    const play = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new Error("stream failed"))
      .mockResolvedValueOnce(undefined)

    render(
      <RecordingsClient categories={categories} recordings={recordings} years={[2026]} />
    )

    fireEvent.click(screen.getByRole("button", { name: "Play" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This recording could not be played"
    )
    expect(screen.getByRole("button", { name: "Play current recording" })).toBeEnabled()

    fireEvent.click(screen.getByRole("button", { name: "Retry playback" }))

    await waitFor(() => expect(play).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

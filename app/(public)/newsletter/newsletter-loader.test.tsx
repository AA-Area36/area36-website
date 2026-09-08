import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useNewsletters } from "@/lib/hooks/use-gdrive-files"
import { NewsletterLoader } from "./newsletter-loader"

vi.mock("@/lib/hooks/use-gdrive-files", () => ({
  useNewsletters: vi.fn(),
}))

vi.mock("./newsletter-viewer", () => ({
  NewsletterViewer: () => <div>Newsletter viewer</div>,
}))

const mockedUseNewsletters = vi.mocked(useNewsletters)

describe("NewsletterLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows a sanitized retryable outage instead of an empty archive", async () => {
    const refetch = vi.fn().mockResolvedValue(undefined)
    mockedUseNewsletters.mockReturnValue({
      data: null,
      isLoading: false,
      error: "private upstream detail",
      refetch,
    })

    render(<NewsletterLoader />)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Newsletters are temporarily unavailable"
    )
    expect(screen.queryByText("No Newsletters Available")).not.toBeInTheDocument()
    expect(screen.queryByText(/private upstream detail/i)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Try Again" }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it("reserves the empty state for a successful empty response", () => {
    mockedUseNewsletters.mockReturnValue({
      data: { newsletters: [], years: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    render(<NewsletterLoader />)

    expect(screen.getByText("No Newsletters Available")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })
})

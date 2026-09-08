import { beforeEach, describe, expect, it, vi } from "vitest"

const { bindMock, getCloudflareContextMock, runMock } = vi.hoisted(() => ({
  bindMock: vi.fn(),
  getCloudflareContextMock: vi.fn(),
  runMock: vi.fn(),
}))

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: getCloudflareContextMock,
}))

import { recordError } from "./errors"

describe("recordError diagnostic minimization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runMock.mockResolvedValue(undefined)
    bindMock.mockImplementation((...values: unknown[]) => ({
      run: () => runMock(...values),
    }))
    getCloudflareContextMock.mockResolvedValue({
      env: {
        DB: {
          prepare: vi.fn(() => ({ bind: bindMock })),
        },
      },
    })
  })

  it("never persists the raw error message", async () => {
    await recordError({
      kind: "FETCH_FAILED",
      route: "/api/example",
      error: new Error("sentinel-user@example.com?token=secret-value"),
    })

    const boundValues = bindMock.mock.calls[0]
    expect(boundValues).not.toContain("sentinel-user@example.com?token=secret-value")
    expect(boundValues).toContain("/api/example")
    expect(runMock).toHaveBeenCalledOnce()
  })
})

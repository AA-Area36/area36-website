import { beforeEach, describe, expect, it, vi } from "vitest"

const getCloudflareContext = vi.fn()
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }))

import { withEdgeCache } from "./edge-cache"

describe("withEdgeCache", () => {
  const entries = new Map<string, Response>()

  beforeEach(() => {
    entries.clear()
    getCloudflareContext.mockReset().mockRejectedValue(new Error("local runtime"))
    vi.stubGlobal("caches", {
      open: vi.fn().mockResolvedValue({
        match: async (key: string) => entries.get(String(key))?.clone(),
        put: async (key: string, response: Response) => {
          entries.set(String(key), response.clone())
        },
        delete: async (key: string) => entries.delete(String(key)),
      }),
    })
  })

  it("coalesces a cold cache fill and persists both fresh and stale entries", async () => {
    let resolve!: (value: { value: string }) => void
    const fetcher = vi.fn(() => new Promise<{ value: string }>((done) => { resolve = done }))

    const first = withEdgeCache("cold", fetcher)
    const second = withEdgeCache("cold", fetcher)
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    resolve({ value: "fresh" })

    await expect(Promise.all([first, second])).resolves.toEqual([
      { data: { value: "fresh" }, status: "miss" },
      { data: { value: "fresh" }, status: "miss" },
    ])
    expect(entries.has("https://cache.internal/edge:cold")).toBe(true)
    expect(entries.has("https://cache.internal/edge:cold:stale")).toBe(true)
  })
})

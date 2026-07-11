import { describe, expect, it } from "vitest"
import { createConcurrencyLimiter } from "./concurrency"

describe("createConcurrencyLimiter", () => {
  it("bounds concurrent work and preserves every result", async () => {
    const limit = createConcurrencyLimiter(3)
    let active = 0
    let maximum = 0

    const results = await Promise.all(
      Array.from({ length: 12 }, (_, value) => limit(async () => {
        active++
        maximum = Math.max(maximum, active)
        await new Promise((resolve) => setTimeout(resolve, 2))
        active--
        return value
      }))
    )

    expect(maximum).toBe(3)
    expect(results).toEqual(Array.from({ length: 12 }, (_, value) => value))
  })
})

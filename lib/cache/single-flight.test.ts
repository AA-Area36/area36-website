import { describe, expect, it, vi } from "vitest"
import { runSingleFlight } from "./single-flight"

describe("runSingleFlight", () => {
  it("coalesces concurrent work for the same key", async () => {
    let resolve!: (value: string) => void
    const task = vi.fn(() => new Promise<string>((done) => { resolve = done }))

    const first = runSingleFlight("same-key", task)
    const second = runSingleFlight("same-key", task)
    expect(task).toHaveBeenCalledTimes(1)
    resolve("value")
    await expect(Promise.all([first, second])).resolves.toEqual(["value", "value"])
  })

  it("allows a new refresh after the prior work completes", async () => {
    const task = vi.fn().mockResolvedValue("value")
    await runSingleFlight("repeat-key", task)
    await runSingleFlight("repeat-key", task)
    expect(task).toHaveBeenCalledTimes(2)
  })
})

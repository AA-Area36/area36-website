// @vitest-environment node
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("Worker theme bootstrap bundling", () => {
  it("does not inject server-only naming helpers into serialized browser scripts", () => {
    const config = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8")
    expect(config).toMatch(/"keep_names"\s*:\s*false/)
  })
})

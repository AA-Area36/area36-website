import { describe, expect, it } from "vitest"
import { renderCommitAuthor } from "./index"

describe("monthly report HTML escaping", () => {
  it("escapes markup in commit author names", () => {
    const result = renderCommitAuthor('<img src=x onerror="alert(1)">', "2026-07-01T00:00:00Z")
    expect(result).not.toContain("<img")
    expect(result).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;")
  })
})

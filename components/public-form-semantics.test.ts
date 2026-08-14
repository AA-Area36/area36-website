import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const publicForms = [
  "app/(public)/conference-manual-count/conference-manual-count-client.tsx",
]

describe("seasonal public form semantics", () => {
  it.each(publicForms)("associates requirements, validation, and outcomes in %s", (file) => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8")

    expect(source).toContain("required")
    expect(source).toContain("aria-invalid")
    expect(source).toContain("aria-describedby")
    expect(source).toContain('role="status"')
    expect(source).toContain('role="alert"')
    expect(source).toContain("outcomeRef.current?.focus()")
  })
})

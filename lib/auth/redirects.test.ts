import { describe, expect, it } from "vitest"
import { isAllowedRedirectHost } from "./redirects"

describe("isAllowedRedirectHost", () => {
  it.each([
    "area36.org",
    "www.area36.org",
    "AREA36.ORG",
    "d1.area36.org",
    "d9.area36.org",
    "d11.area36.org",
    "d27.area36.org",
  ])("allows an owned Area 36 host: %s", (hostname) => {
    expect(isAllowedRedirectHost(hostname)).toBe(true)
  })

  it.each([
    "d0.area36.org",
    "d10.area36.org",
    "d28.area36.org",
    "d1.area36.org.evil.example",
    "area36.org.evil.example",
    "evil.example",
    "localhost",
  ])("rejects an unowned or unavailable host: %s", (hostname) => {
    expect(isAllowedRedirectHost(hostname)).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { isSameOriginRequest } from "./same-origin"

function request(origin?: string) {
  const headers = new Headers()
  if (origin) headers.set("Origin", origin)
  return {
    headers,
    url: "https://area36.org/api/quorum/event/admin/attendees",
  } as Request
}

describe("same-origin request validation", () => {
  it("accepts an exact same-origin request", () => {
    expect(isSameOriginRequest(request("https://area36.org"))).toBe(true)
  })

  it("rejects cross-origin, missing, and opaque origins", () => {
    expect(isSameOriginRequest(request("https://attacker.example"))).toBe(false)
    expect(isSameOriginRequest(request())).toBe(false)
    expect(isSameOriginRequest(request("null"))).toBe(false)
  })
})

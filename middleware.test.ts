import { describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { getCloudflareContext, getDistrictSiteForMiddleware } = vi.hoisted(() => ({
  getCloudflareContext: vi.fn(),
  getDistrictSiteForMiddleware: vi.fn(),
}))
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext }))
vi.mock("@/lib/district/sites-middleware", () => ({ getDistrictSiteForMiddleware }))

import { middleware } from "./middleware"

function requestWithHeaders(url: string, values: Record<string, string>): NextRequest {
  const request = new NextRequest(url)
  Object.defineProperty(request, "headers", { value: new Headers(values) })
  return request
}

describe("middleware routing boundaries", () => {
  it("redirects a proxied public HTTP request to HTTPS", async () => {
    const request = requestWithHeaders("http://area36.org/events?view=calendar", {
      host: "area36.org", "x-forwarded-proto": "http",
    })
    expect(request.headers.get("host")).toBe("area36.org")
    expect(request.headers.get("x-forwarded-proto")).toBe("http")

    const response = await middleware(request)

    expect(response.status).toBe(301)
    expect(response.headers.get("location")).toBe("https://area36.org/events?view=calendar")
  })

  it("rewrites an enabled district host to its scoped public route", async () => {
    getCloudflareContext.mockResolvedValue({ env: { DB: {} } })
    getDistrictSiteForMiddleware.mockResolvedValue({ enabled: true, mode: "hosted" })
    const request = requestWithHeaders("https://d24.area36.org/calendar", {
      host: "d24.area36.org", "x-forwarded-proto": "https",
    })
    expect(request.headers.get("host")).toBe("d24.area36.org")

    const response = await middleware(request)

    expect(response.headers.get("x-middleware-rewrite")).toContain("/district-site/24/calendar")
  })
})

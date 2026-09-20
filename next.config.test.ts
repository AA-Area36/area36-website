import { describe, expect, it } from "vitest"
import { unstable_getResponseFromNextConfig } from "next/experimental/testing/server"
import nextConfig from "./next.config"

describe("configured response headers", () => {
  it("permits the same-origin PDF viewer without weakening other routes", async () => {
    const preview = await unstable_getResponseFromNextConfig({
      url: "https://area36.org/api/files/preview/example.pdf",
      nextConfig,
    })
    const otherRoute = await unstable_getResponseFromNextConfig({
      url: "https://area36.org/resources",
      nextConfig,
    })

    expect(preview.headers.get("x-frame-options")).toBe("SAMEORIGIN")
    expect(preview.headers.get("content-security-policy")).toContain("frame-ancestors 'self'")
    expect(preview.headers.get("content-security-policy")).not.toContain("frame-ancestors 'none'")
    expect(preview.headers.get("content-security-policy-report-only")).toBeNull()
    expect(otherRoute.headers.get("x-frame-options")).toBe("DENY")
    expect(otherRoute.headers.get("content-security-policy")).toContain("frame-ancestors 'none'")
    expect(otherRoute.headers.get("content-security-policy-report-only")).toBeNull()
  })
})

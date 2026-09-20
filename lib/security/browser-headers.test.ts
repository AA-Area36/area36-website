import { describe, expect, it } from "vitest"
import {
  BROWSER_SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY,
} from "./browser-headers"

function createHeaders(): Headers {
  const headers = new Headers()
  for (const { key, value } of BROWSER_SECURITY_HEADERS) {
    headers.set(key, value)
  }
  return headers
}

describe("browser security headers", () => {
  it("defines each required defense exactly once without unsafe header bytes", () => {
    const headers = createHeaders()

    expect([...headers.keys()].map((key) => key.toLowerCase()).sort()).toEqual(
      [
        "content-security-policy",
        "permissions-policy",
        "referrer-policy",
        "strict-transport-security",
        "x-content-type-options",
        "x-frame-options",
      ].sort(),
    )

    for (const value of headers.values()) {
      expect(value).not.toMatch(/[\r\n]/)
    }
  })

  it("enforces CSP while denying dangerous embedding and plugins", () => {
    const headers = createHeaders()

    expect(headers.has("content-security-policy-report-only")).toBe(false)
    expect(headers.get("content-security-policy")).toBe(
      CONTENT_SECURITY_POLICY,
    )
    expect(CONTENT_SECURITY_POLICY).toContain("object-src 'none'")
    expect(CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'")
    expect(headers.get("x-frame-options")).toBe("DENY")
  })

  it("allows the current reCAPTCHA and document-preview origins during rollout", () => {
    expect(CONTENT_SECURITY_POLICY).toContain("https://www.google.com")
    expect(CONTENT_SECURITY_POLICY).toContain("https://www.gstatic.com")
    expect(CONTENT_SECURITY_POLICY).toContain("https://www.recaptcha.net")
    expect(CONTENT_SECURITY_POLICY).toContain("https://drive.google.com")
  })
})

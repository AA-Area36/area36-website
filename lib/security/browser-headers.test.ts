import { describe, expect, it } from "vitest"
import {
  BROWSER_SECURITY_HEADERS,
  CONTENT_SECURITY_POLICY_REPORT_ONLY,
} from "./browser-headers"

function createHeaders(): Headers {
  return new Headers(
    BROWSER_SECURITY_HEADERS.map(({ key, value }) => [key, value] as const),
  )
}

describe("browser security headers", () => {
  it("defines each required defense exactly once without unsafe header bytes", () => {
    const headers = createHeaders()

    expect([...headers.keys()].map((key) => key.toLowerCase()).sort()).toEqual(
      [
        "content-security-policy-report-only",
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

  it("keeps CSP observational while denying dangerous embedding and plugins", () => {
    const headers = createHeaders()

    expect(headers.has("content-security-policy")).toBe(false)
    expect(headers.get("content-security-policy-report-only")).toBe(
      CONTENT_SECURITY_POLICY_REPORT_ONLY,
    )
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("object-src 'none'")
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("frame-ancestors 'none'")
    expect(headers.get("x-frame-options")).toBe("DENY")
  })

  it("allows the current reCAPTCHA and document-preview origins during rollout", () => {
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://www.google.com")
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://www.gstatic.com")
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://www.recaptcha.net")
    expect(CONTENT_SECURITY_POLICY_REPORT_ONLY).toContain("https://drive.google.com")
  })
})

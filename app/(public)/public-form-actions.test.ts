import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  appendAreaAssemblyRegistrationMock,
  appendConferenceManualCountMock,
  checkRateLimitMock,
  getCloudflareContextMock,
  sendEmailMock,
} = vi.hoisted(() => ({
  appendAreaAssemblyRegistrationMock: vi.fn(),
  appendConferenceManualCountMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getCloudflareContextMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock("@/lib/google/sheets", () => ({
  appendAreaAssemblyRegistration: appendAreaAssemblyRegistrationMock,
  appendConferenceManualCount: appendConferenceManualCountMock,
}))
vi.mock("@/lib/gmail/client", () => ({
  getGmailCredentials: vi.fn(),
  sendEmail: sendEmailMock,
}))
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}))
vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: getCloudflareContextMock,
}))

import { submitAreaAssemblyRegistration } from "./area-assembly-4-21-26/actions"
import { submitConferenceManualCount } from "./conference-manual-count/actions"
import { submitNewcomerForm } from "./treatment-temporary-contact-program/actions"

describe("public form side-effect boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "development")
    checkRateLimitMock.mockResolvedValue({ ok: false })
  })

  it("does not append a conference count when the submission is rate limited", async () => {
    await expect(
      submitConferenceManualCount({
        contactName: "Ada Member",
        email: "ada@example.com",
        role: "GSR",
        manualCount: 2,
        recaptchaToken: "",
      })
    ).resolves.toMatchObject({ success: false, error: expect.stringContaining("Too many") })
    expect(appendConferenceManualCountMock).not.toHaveBeenCalled()
  })

  it("does not access rate limits or append after assembly registration closes", async () => {
    await expect(
      submitAreaAssemblyRegistration({
        firstName: "Ada",
        lastInitial: "M",
        attendingApril18: true,
        attendingApril18InPerson: true,
        attendingApril21: false,
        recaptchaToken: "",
      })
    ).resolves.toMatchObject({ success: false, error: expect.stringContaining("closed") })
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(appendAreaAssemblyRegistrationMock).not.toHaveBeenCalled()
  })

  it("does not obtain credentials or send treatment email when rate limited", async () => {
    await expect(
      submitNewcomerForm({
        firstName: "Ada",
        lastName: "Member",
        phone: "555-0100",
        age: "40",
        gender: "Woman",
        dischargeDate: "2026-08-15",
        city: "Minneapolis",
        zipCode: "55401",
        treatmentFacility: "Example Facility",
        treatmentFacilityPhone: "555-0101",
        treatmentFacilityAddress: "123 Main St",
        recaptchaToken: "",
      })
    ).resolves.toMatchObject({ success: false, error: expect.stringContaining("Too many") })
    expect(getCloudflareContextMock).not.toHaveBeenCalled()
    expect(sendEmailMock).not.toHaveBeenCalled()
  })
})

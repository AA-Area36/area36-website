import { beforeEach, describe, expect, it, vi } from "vitest"

const { checkRateLimitMock, sendContactEmailMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  sendContactEmailMock: vi.fn(),
}))

vi.mock("@/lib/email", () => ({ sendContactEmail: sendContactEmailMock }))
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}))

import { submitContactForm } from "./actions"

const validSubmission = {
  recipients: ["webmaster"],
  firstName: "Ada",
  lastName: "Member",
  email: "ada@example.com",
  phone: "",
  subject: "Website question",
  message: "This is a valid contact form message.",
  consent: true as const,
  recaptchaToken: "",
}

describe("submitContactForm side-effect boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "development")
  })

  it("does not send email when the submission is rate limited", async () => {
    checkRateLimitMock.mockResolvedValue({ ok: false })

    await expect(submitContactForm(validSubmission)).resolves.toMatchObject({
      success: false,
      error: "Too many submissions. Please try again later.",
    })
    expect(sendContactEmailMock).not.toHaveBeenCalled()
  })

  it("does not evaluate rate limits or send email for invalid input", async () => {
    await expect(
      submitContactForm({ ...validSubmission, message: "short" })
    ).resolves.toMatchObject({ success: false })
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(sendContactEmailMock).not.toHaveBeenCalled()
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"

const { checkRateLimitMock, getDbMock, uploadImageMock } = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  getDbMock: vi.fn(),
  uploadImageMock: vi.fn(),
}))

vi.mock("@/lib/db", () => ({ getDb: getDbMock }))
vi.mock("@/lib/r2", () => ({ uploadImage: uploadImageMock }))
vi.mock("@/lib/security/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
  getClientIp: vi.fn().mockResolvedValue("127.0.0.1"),
}))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import { submitDriveConfirmation } from "./actions"

function createValidFormData() {
  const formData = new FormData()
  formData.set("district", "District 1")
  formData.set("subscriptionCount", "2")
  formData.set("privacyAcknowledged", "true")
  formData.set("recaptchaToken", "")
  formData.set(
    "confirmationImage",
    new File(["image-bytes"], "confirmation.png", { type: "image/png" })
  )
  return formData
}

describe("submitDriveConfirmation side-effect boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NODE_ENV", "development")
  })

  it("does not access R2 or D1 when the submission is rate limited", async () => {
    checkRateLimitMock.mockResolvedValue({ ok: false })

    await expect(submitDriveConfirmation(createValidFormData())).resolves.toMatchObject({
      success: false,
      error: "Too many submissions. Please try again later.",
    })
    expect(uploadImageMock).not.toHaveBeenCalled()
    expect(getDbMock).not.toHaveBeenCalled()
  })

  it("does not evaluate rate limits or access storage for malformed input", async () => {
    const formData = createValidFormData()
    formData.set("subscriptionCount", "0")

    await expect(submitDriveConfirmation(formData)).resolves.toMatchObject({ success: false })
    expect(checkRateLimitMock).not.toHaveBeenCalled()
    expect(uploadImageMock).not.toHaveBeenCalled()
    expect(getDbMock).not.toHaveBeenCalled()
  })
})
